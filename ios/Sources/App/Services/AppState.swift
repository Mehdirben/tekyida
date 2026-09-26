import SwiftUI
import Combine
import Network

@MainActor
public final class AppState: ObservableObject {
    @Published public var notebooks: [Notebook] = []
    @Published public var activeNotebookId: String?
    @Published public var contacts: [Contact] = []
    @Published public var experiences: [Experience] = []
    @Published public var transactions: [Transaction] = []

    @Published public var isAmountsHidden = false
    @Published public var themeMode: AppThemeMode = .system
    @Published public var language: AppLanguage = .english
    @Published public var transferRedirect = true
    @Published public var amountsHiddenByDefault = false
    @Published public var userEmail = ""

    @Published public var isAuthenticated = false
    @Published public var isLoading = true
    @Published public var isAwaitingEmailVerification = false
    @Published public var authError: String?
    @Published public var appError: String?
    @Published public private(set) var isOnline = true
    @Published public private(set) var isSyncing = false
    @Published public private(set) var pendingSyncCount = 0

    private let backend = ConvexBackend.shared
    private let offlineCache = OfflineCache()
    private var pendingMutations: [QueuedMutation] = []
    private var localToServerIds: [String: String] = [:]
    private let pathMonitor = NWPathMonitor()
    private let pathMonitorQueue = DispatchQueue(label: "com.tekyida.network-monitor")
    private var retryTask: Task<Void, Never>?
    private let activeNotebookKey = "tekyida_active_notebook_id"
    private let themeKey = "tekyida_theme_mode"
    private let languageKey = "tekyida_language"
    private let amountsDefaultKey = "tekyida_amounts_hidden_default"
    private let transferRedirectKey = "tekyida_transfer_redirect"

    public init() {
        ["tekyida_lock_enabled", "tekyida_lock_hash", "tekyida_lock_salt"]
            .forEach { UserDefaults.standard.removeObject(forKey: $0) }
        loadSettings()
        if let snapshot = offlineCache.load() {
            restoreLocalSnapshot(snapshot)
            if backend.hasSession { isLoading = false }
        }
        isAuthenticated = backend.hasSession
        startConnectivityMonitoring()
        guard isAuthenticated else {
            isLoading = false
            return
        }
        Task { await restoreSession() }
    }

    deinit {
        pathMonitor.cancel()
        retryTask?.cancel()
    }

    public var shouldShowSyncStatus: Bool {
        !isOnline || isSyncing || pendingSyncCount > 0
    }

    public func isItemPendingSync(id: String) -> Bool {
        if id.hasPrefix("offline_") { return true }
        return pendingMutations.contains { mutation in
            if mutation.localCreatedId == id { return true }
            guard let raw = try? JSONSerialization.jsonObject(with: mutation.arguments),
                  let dict = raw as? [String: Any] else { return false }
            if let targetId = dict["id"] as? String, targetId == id { return true }
            return false
        }
    }

    public var activeNotebook: Notebook? {
        if let id = activeNotebookId, let found = notebooks.first(where: { $0.id == id && !$0.archived }) {
            return found
        }
        return notebooks.first(where: { !$0.archived })
    }

    public var activeNotebooksList: [Notebook] {
        notebooks.filter { !$0.archived }.sorted { first, second in
            switch (first.order, second.order) {
            case let (a?, b?) where a != b:
                return a < b
            case (_?, nil):
                return true
            case (nil, _?):
                return false
            default:
                return first.createdAt > second.createdAt
            }
        }
    }

    public var archivedNotebooksList: [Notebook] {
        notebooks.filter { $0.archived }
    }

    public func directTransactions(for contactId: String) -> [Transaction] {
        transactions.filter { $0.contactId == contactId && $0.experienceId == nil }.sorted { $0.date > $1.date }
    }

    public func lastTransactionDate(for contactId: String) -> Date? {
        transactions
            .filter { $0.contactId == contactId }
            .map(\.date)
            .max()
    }

    public func closedExperiences(for contactId: String) -> [Experience] {
        experiences.filter { $0.contactId == contactId && $0.closed }.sorted { $0.createdAt > $1.createdAt }
    }

    public func contactBalance(_ contactId: String) -> Double {
        let direct = directTransactions(for: contactId).reduce(0.0) { $0 + $1.amount }
        return direct + closedExperiences(for: contactId).reduce(0.0) { $0 + experienceBalance($1.id) }
    }

    public func experienceBalance(_ experienceId: String) -> Double {
        transactions.filter { $0.experienceId == experienceId }.reduce(0.0) { $0 + $1.amount }
    }

    public func experienceTransactions(_ experienceId: String) -> [Transaction] {
        transactions.filter { $0.experienceId == experienceId }.sorted { $0.date > $1.date }
    }

    public func notebookBalance(_ notebookId: String) -> Double {
        transactions.filter { $0.notebookId == notebookId }.reduce(0.0) { $0 + $1.amount }
    }

    public func moneyOwed(for notebookId: String) -> Double {
        contacts.filter { $0.notebookId == notebookId }.reduce(0.0) { total, contact in
            let balance = contactBalance(contact.id)
            return total + (balance > 0 ? balance : 0)
        }
    }

    public func moneyGiven(for notebookId: String) -> Double {
        contacts.filter { $0.notebookId == notebookId }.reduce(0.0) { total, contact in
            let balance = contactBalance(contact.id)
            return total + (balance < 0 ? abs(balance) : 0)
        }
    }

    public func netBalance(for notebookId: String) -> Double {
        moneyOwed(for: notebookId) - moneyGiven(for: notebookId)
    }

    public func totalExperiencesBalance(for notebookId: String) -> Double {
        experiences.filter { $0.notebookId == notebookId && !$0.closed }
            .reduce(0.0) { $0 + experienceBalance($1.id) }
    }

    // MARK: - Account and synchronization

    public func signIn(email: String, password: String, name: String? = nil, isRegistration: Bool = false) async {
        authError = nil
        let account = normalizedEmail(email)
        if let owner = pendingMutations.first?.accountEmail, normalizedEmail(owner) != account {
            authError = "There are offline changes waiting for another account. Sign in with that account and sync first."
            return
        }
        do {
            let signedIn = try await backend.signIn(
                email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                password: password,
                name: name,
                flow: isRegistration ? "signUp" : "signIn"
            )
            if signedIn {
                isAwaitingEmailVerification = false
                await finishSignIn(accountEmail: account)
            } else {
                isAwaitingEmailVerification = true
            }
        } catch {
            authError = error.localizedDescription
        }
    }

    public func verifyEmail(email: String, code: String) async {
        authError = nil
        let account = normalizedEmail(email)
        if let owner = pendingMutations.first?.accountEmail, normalizedEmail(owner) != account {
            authError = "There are offline changes waiting for another account. Sign in with that account and sync first."
            return
        }
        do {
            guard try await backend.verifyEmail(
                email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                code: code.trimmingCharacters(in: .whitespacesAndNewlines)
            ) else {
                throw BackendError.message("The verification code was not accepted.")
            }
            isAwaitingEmailVerification = false
            await finishSignIn(accountEmail: account)
        } catch {
            authError = error.localizedDescription
        }
    }

    public func resendVerification(email: String) async {
        authError = nil
        do {
            try await backend.resendVerification(
                email: email.trimmingCharacters(in: .whitespacesAndNewlines)
            )
        } catch {
            authError = error.localizedDescription
        }
    }

    public func signOut() async {
        guard pendingMutations.isEmpty else {
            appError = "Reconnect and let pending offline changes sync before signing out."
            return
        }
        await backend.signOut()
        isAuthenticated = false
        isAwaitingEmailVerification = false
        authError = nil
        appError = nil
        clearCachedAccountData()
    }

    public func refresh() async {
        guard isAuthenticated, isOnline else { return }
        await syncAndRefresh()
    }

    public func changeEmail(to email: String) async throws {
        guard pendingMutations.isEmpty else {
            throw BackendError.message("Sync pending offline changes before changing the account email.")
        }
        let requestedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        try await backend.actionVoid("users:changeEmail", args: ["newEmail": requestedEmail])
        let updatedEmail: String? = try await backend.query("users:currentEmail")
        userEmail = normalizedEmail(updatedEmail ?? requestedEmail)
        persistOfflineSnapshot()
    }

    public func changePassword(current: String, new: String) async throws {
        try await backend.actionVoid(
            "users:changePassword",
            args: ["currentPassword": current, "newPassword": new]
        )
    }

    private func finishSignIn(accountEmail: String) async {
        if !userEmail.isEmpty && normalizedEmail(userEmail) != accountEmail && pendingMutations.isEmpty {
            clearCachedAccountData()
        }
        userEmail = accountEmail
        isAuthenticated = true
        isLoading = true
        await restoreSession()
    }

    private func restoreSession() async {
        do {
            try await refreshData()
            isAuthenticated = true
            appError = nil
            if !pendingMutations.isEmpty { await syncPendingMutations() }
        } catch {
            if BackendError.isRetryable(error) {
                if BackendError.isConnectivityFailure(error) { isOnline = false }
                isAuthenticated = true
                appError = nil
            } else if backend.hasSession {
                isAuthenticated = true
                appError = error.localizedDescription
            } else {
                isAuthenticated = false
                authError = error.localizedDescription
                // Keep local data and queued writes so this account can recover them later.
            }
        }
        isLoading = false
    }

    private func startConnectivityMonitoring() {
        pathMonitor.pathUpdateHandler = { [weak self] path in
            let online = path.status == .satisfied
            Task { @MainActor [weak self] in
                guard let self else { return }
                let wasOnline = self.isOnline
                self.isOnline = online
                if !online && self.isLoading { self.isLoading = false }
                if online && !wasOnline && self.isAuthenticated { await self.syncAndRefresh() }
            }
        }
        pathMonitor.start(queue: pathMonitorQueue)
        retryTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 30_000_000_000)
                guard let self else { return }
                if self.isOnline && self.isAuthenticated && !self.pendingMutations.isEmpty {
                    await self.syncPendingMutations()
                }
            }
        }
    }

    private func restoreLocalSnapshot(_ snapshot: OfflineSnapshot) {
        userEmail = snapshot.accountEmail
        pendingMutations = snapshot.pendingMutations
        localToServerIds = snapshot.localToServerIds
        pendingSyncCount = pendingMutations.count
        guard backend.hasSession else { return }
        notebooks = snapshot.notebooks
        contacts = snapshot.contacts
        experiences = snapshot.experiences
        transactions = snapshot.transactions
        activeNotebookId = snapshot.activeNotebookId ?? activeNotebookId
    }

    private func makeOfflineSnapshot() -> OfflineSnapshot {
        OfflineSnapshot(
            accountEmail: normalizedEmail(userEmail),
            notebooks: notebooks,
            contacts: contacts,
            experiences: experiences,
            transactions: transactions,
            pendingMutations: pendingMutations,
            localToServerIds: localToServerIds,
            activeNotebookId: activeNotebookId
        )
    }

    private func persistOfflineSnapshot() {
        guard !normalizedEmail(userEmail).isEmpty else { return }
        do {
            try offlineCache.save(makeOfflineSnapshot())
        } catch {
            appError = "Could not save offline data: \(error.localizedDescription)"
        }
    }

    private func clearCachedAccountData() {
        notebooks = []
        contacts = []
        experiences = []
        transactions = []
        activeNotebookId = nil
        localToServerIds = [:]
        pendingMutations = []
        pendingSyncCount = 0
        userEmail = ""
        UserDefaults.standard.removeObject(forKey: activeNotebookKey)
        offlineCache.clear()
    }

    private func normalizedEmail(_ value: String) -> String {
        value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    private func refreshData() async throws {
        let loadedNotebooks: [Notebook] = try await backend.query("notebooks:list")
        var loadedContacts: [Contact] = []
        var loadedExperiences: [Experience] = []
        var loadedTransactions: [Transaction] = []
        for notebook in loadedNotebooks {
            let args: [String: Any] = ["notebookId": notebook.id]
            let notebookContacts: [Contact] = try await backend.query("contacts:list", args: args)
            let notebookExperiences: [Experience] = try await backend.query("experiences:list", args: args)
            loadedContacts += notebookContacts
            loadedExperiences += notebookExperiences
            for contact in notebookContacts {
                let contactTransactions: [Transaction] = try await backend.query(
                    "transactions:list", args: ["contactId": contact.id]
                )
                loadedTransactions += contactTransactions
            }
            for experience in notebookExperiences {
                let experienceTransactions: [Transaction] = try await backend.query(
                    "transactions:list", args: ["experienceId": experience.id]
                )
                loadedTransactions += experienceTransactions
            }
        }

        let email: String? = try await backend.query("users:currentEmail")
        let loadedEmail = normalizedEmail(email ?? userEmail)
        if pendingMutations.contains(where: { normalizedEmail($0.accountEmail) != loadedEmail }) {
            throw BackendError.message("Pending offline changes belong to another account. Sign in to that account to sync them.")
        }

        notebooks = loadedNotebooks
        contacts = loadedContacts
        experiences = loadedExperiences
        transactions = loadedTransactions
        userEmail = loadedEmail
        if let activeNotebookId, let serverId = localToServerIds[activeNotebookId] {
            self.activeNotebookId = serverId
        }
        let activeNotebookIsPendingCreate = pendingMutations.contains {
            $0.functionPath == "notebooks:create" && $0.localCreatedId == activeNotebookId
        }
        if activeNotebookId == nil ||
            (!loadedNotebooks.contains(where: { $0.id == activeNotebookId }) && !activeNotebookIsPendingCreate) {
            activeNotebookId = loadedNotebooks.first(where: { !$0.archived })?.id
        }
        applyPendingMutationsOptimistically()
        persistOfflineSnapshot()
    }

    private func applyPendingMutationsOptimistically() {
        for mutation in pendingMutations {
            guard let raw = try? JSONSerialization.jsonObject(with: mutation.arguments),
                  let args = raw as? [String: Any] else { continue }
            let resolved = replaceLocalIds(in: args) as? [String: Any] ?? args
            applyOfflineMutation(mutation.functionPath, args: resolved, localCreatedId: mutation.localCreatedId)
        }
    }

    private func replaceLocalIds(in value: Any) -> Any {
        if let string = value as? String { return localToServerIds[string] ?? string }
        if let dictionary = value as? [String: Any] {
            return dictionary.mapValues { replaceLocalIds(in: $0) }
        }
        if let array = value as? [Any] { return array.map { replaceLocalIds(in: $0) } }
        return value
    }

    private func applyOfflineMutation(_ path: String, args: [String: Any], localCreatedId: String?) {
        switch path {
        case "notebooks:create":
            guard let id = localCreatedId, let name = args["name"] as? String else { return }
            notebooks.insert(Notebook(id: id, name: name), at: 0)
            if activeNotebookId == nil { activeNotebookId = id }
        case "notebooks:update":
            guard let id = args["id"] as? String, let index = notebooks.firstIndex(where: { $0.id == id }),
                  let name = args["name"] as? String else { return }
            notebooks[index].name = name
        case "notebooks:archive":
            guard let id = args["id"] as? String, let index = notebooks.firstIndex(where: { $0.id == id }),
                  let archived = args["archived"] as? Bool else { return }
            notebooks[index].archived = archived
            if archived && activeNotebookId == id {
                activeNotebookId = activeNotebooksList.first(where: { $0.id != id })?.id
            }
        case "notebooks:remove":
            guard let id = args["id"] as? String else { return }
            notebooks.removeAll { $0.id == id }
            contacts.removeAll { $0.notebookId == id }
            experiences.removeAll { $0.notebookId == id }
            transactions.removeAll { $0.notebookId == id }
            if activeNotebookId == id { activeNotebookId = activeNotebooksList.first?.id }
        case "notebooks:reorder":
            guard let ids = args["ids"] as? [String] else { return }
            for index in notebooks.indices {
                if let order = ids.firstIndex(of: notebooks[index].id) { notebooks[index].order = order }
            }
        case "contacts:create":
            guard let id = localCreatedId, let notebookId = args["notebookId"] as? String,
                  let name = args["name"] as? String else { return }
            contacts.insert(Contact(id: id, notebookId: notebookId, name: name, phone: args["phone"] as? String), at: 0)
        case "contacts:update":
            guard let id = args["id"] as? String, let index = contacts.firstIndex(where: { $0.id == id }),
                  let name = args["name"] as? String else { return }
            contacts[index].name = name
            contacts[index].phone = args["phone"] as? String
        case "contacts:remove":
            guard let id = args["id"] as? String else { return }
            contacts.removeAll { $0.id == id }
            transactions.removeAll { $0.contactId == id }
            for index in experiences.indices where experiences[index].contactId == id {
                experiences[index].contactId = nil
            }
        case "experiences:create":
            guard let id = localCreatedId, let notebookId = args["notebookId"] as? String,
                  let name = args["name"] as? String else { return }
            experiences.insert(Experience(
                id: id, notebookId: notebookId, contactId: args["contactId"] as? String, name: name
            ), at: 0)
        case "experiences:update":
            guard let id = args["id"] as? String, let index = experiences.firstIndex(where: { $0.id == id }),
                  let name = args["name"] as? String else { return }
            experiences[index].name = name
            experiences[index].contactId = args["contactId"] as? String
        case "experiences:close", "experiences:reopen":
            guard let id = args["id"] as? String, let index = experiences.firstIndex(where: { $0.id == id }) else { return }
            experiences[index].closed = path == "experiences:close"
        case "experiences:transfer":
            guard let id = args["id"] as? String, let target = args["targetNotebookId"] as? String,
                  let index = experiences.firstIndex(where: { $0.id == id }) else { return }
            experiences[index].notebookId = target
            experiences[index].contactId = nil
            for txIndex in transactions.indices where transactions[txIndex].experienceId == id {
                transactions[txIndex].notebookId = target
                transactions[txIndex].contactId = nil
            }
        case "experiences:remove":
            guard let id = args["id"] as? String else { return }
            experiences.removeAll { $0.id == id }
            transactions.removeAll { $0.experienceId == id }
        case "transactions:create":
            guard let id = localCreatedId, let notebookId = args["notebookId"] as? String,
                  let amount = args["amount"] as? Double else { return }
            let ms = args["date"] as? Double ?? Date().timeIntervalSince1970 * 1000
            transactions.insert(Transaction(
                id: id, notebookId: notebookId, contactId: args["contactId"] as? String,
                experienceId: args["experienceId"] as? String, amount: amount,
                description: args["description"] as? String,
                date: Date(timeIntervalSince1970: ms / 1000)
            ), at: 0)
        case "transactions:update":
            guard let id = args["id"] as? String, let index = transactions.firstIndex(where: { $0.id == id }),
                  let amount = args["amount"] as? Double else { return }
            transactions[index].amount = amount
            transactions[index].description = args["description"] as? String
            if let milliseconds = args["date"] as? Double {
                transactions[index].date = Date(timeIntervalSince1970: milliseconds / 1000)
            }
        case "transactions:remove":
            guard let id = args["id"] as? String else { return }
            transactions.removeAll { $0.id == id }
        default:
            break
        }
    }

    private func validateOfflineMutation(_ path: String, args: [String: Any]) throws {
        let experienceId: String?
        if path == "transactions:create" {
            experienceId = args["experienceId"] as? String
        } else if path == "transactions:update" || path == "transactions:remove" {
            guard let transactionId = args["id"] as? String,
                  let transaction = transactions.first(where: { $0.id == transactionId }) else { return }
            experienceId = transaction.experienceId
        } else {
            return
        }
        guard let experienceId,
              experiences.first(where: { $0.id == experienceId })?.closed == true else { return }
        throw BackendError.message("Transactions in a closed experience cannot be changed.")
    }

    private func enqueueOfflineMutation(_ path: String, args: [String: Any]) throws -> Data {
        try validateOfflineMutation(path, args: args)
        let account = normalizedEmail(userEmail)
        guard !account.isEmpty else {
            throw BackendError.message("Sign in once while online before making offline changes.")
        }
        if let owner = pendingMutations.first?.accountEmail, normalizedEmail(owner) != account {
            throw BackendError.message("Reconnect using the account that owns the pending offline changes.")
        }

        if path.hasSuffix(":remove"), let targetId = args["id"] as? String {
            if targetId.hasPrefix("offline_") {
                pendingMutations.removeAll { queued in
                    if queued.localCreatedId == targetId { return true }
                    guard let raw = try? JSONSerialization.jsonObject(with: queued.arguments),
                          let dict = raw as? [String: Any] else { return false }
                    if let itemId = dict["id"] as? String, itemId == targetId { return true }
                    if path == "notebooks:remove", let nbId = dict["notebookId"] as? String, nbId == targetId { return true }
                    if path == "experiences:remove", let expId = dict["experienceId"] as? String, expId == targetId { return true }
                    if path == "contacts:remove", let cId = dict["contactId"] as? String, cId == targetId { return true }
                    return false
                }
                pendingSyncCount = pendingMutations.count
                applyOfflineMutation(path, args: args, localCreatedId: nil)
                persistOfflineSnapshot()
                return Data("null".utf8)
            } else {
                pendingMutations.removeAll { queued in
                    guard queued.functionPath.hasSuffix(":update"),
                          let raw = try? JSONSerialization.jsonObject(with: queued.arguments),
                          let dict = raw as? [String: Any] else { return false }
                    return dict["id"] as? String == targetId
                }
            }
        }

        let createPaths = ["notebooks:create", "contacts:create", "experiences:create", "transactions:create"]
        let localId = createPaths.contains(path) ? "offline_\(UUID().uuidString)" : nil
        let encodedArgs = try JSONSerialization.data(withJSONObject: args, options: [.sortedKeys])
        pendingMutations.append(QueuedMutation(
            functionPath: path,
            arguments: encodedArgs,
            localCreatedId: localId,
            accountEmail: account
        ))
        pendingSyncCount = pendingMutations.count
        applyOfflineMutation(path, args: args, localCreatedId: localId)
        persistOfflineSnapshot()
        if isOnline { Task { await self.syncPendingMutations() } }
        if let localId {
            return try JSONSerialization.data(withJSONObject: localId, options: [.fragmentsAllowed])
        }
        return Data("null".utf8)
    }

    private func refreshDataAndReportError() async {
        do {
            try await refreshData()
            appError = nil
        } catch {
            if BackendError.isConnectivityFailure(error) {
                isOnline = false
            } else if !backend.hasSession {
                isAuthenticated = false
                authError = error.localizedDescription
            } else {
                appError = error.localizedDescription
            }
        }
    }

    private func syncAndRefresh() async {
        guard isAuthenticated, isOnline else { return }
        if pendingMutations.isEmpty {
            await refreshDataAndReportError()
        } else {
            await syncPendingMutations()
        }
    }

    private func syncPendingMutations() async {
        guard isAuthenticated, isOnline, !isSyncing, !pendingMutations.isEmpty else { return }
        isSyncing = true
        var completedAny = false
        var syncError: String?
        while isOnline && !pendingMutations.isEmpty {
            let queued = pendingMutations[0]
            guard normalizedEmail(queued.accountEmail) == normalizedEmail(userEmail) else {
                appError = "Pending offline changes belong to another account. Sign in to that account to sync them."
                break
            }
            guard let raw = try? JSONSerialization.jsonObject(with: queued.arguments),
                  let args = raw as? [String: Any] else {
                pendingMutations.removeFirst()
                pendingSyncCount = pendingMutations.count
                syncError = "An offline change could not be read and was removed."
                completedAny = true
                persistOfflineSnapshot()
                continue
            }
            let resolvedArgs = replaceLocalIds(in: args) as? [String: Any] ?? args
            if let itemId = resolvedArgs["id"] as? String, itemId.hasPrefix("offline_") {
                pendingMutations.removeFirst()
                pendingSyncCount = pendingMutations.count
                completedAny = true
                persistOfflineSnapshot()
                continue
            }
            do {
                let result = try await backend.mutation(queued.functionPath, args: resolvedArgs)
                if let localId = queued.localCreatedId {
                    let decodedServerId = (try? JSONSerialization.jsonObject(with: result, options: [.fragmentsAllowed])) as? String
                        ?? (try? JSONDecoder().decode(String.self, from: result))
                    guard let serverId = decodedServerId else {
                        throw BackendError.message("The server did not return an ID for a newly created item.")
                    }
                    localToServerIds[localId] = serverId
                    if activeNotebookId == localId { activeNotebookId = serverId }
                }
                pendingMutations.removeFirst()
                pendingSyncCount = pendingMutations.count
                completedAny = true
                persistOfflineSnapshot()
            } catch {
                if BackendError.isAuthenticationFailure(error) {
                    isAuthenticated = false
                    authError = error.localizedDescription
                    break
                }
                if BackendError.isRetryable(error) {
                    if BackendError.isConnectivityFailure(error) { isOnline = false }
                    break
                }
                pendingMutations.removeFirst()
                pendingSyncCount = pendingMutations.count
                syncError = "An offline change could not be synced: \(error.localizedDescription)"
                completedAny = true
                persistOfflineSnapshot()
            }
        }
        isSyncing = false
        if completedAny && isOnline {
            await refreshDataAndReportError()
        } else {
            persistOfflineSnapshot()
        }
        if let syncError { appError = syncError }
    }

    private func runMutation(_ path: String, args: [String: Any] = [:]) async throws -> Data {
        guard isAuthenticated else { throw BackendError.message("Sign in to change your data.") }
        if !pendingMutations.isEmpty || !isOnline {
            return try enqueueOfflineMutation(path, args: args)
        }
        do {
            let result = try await backend.mutation(path, args: args)
            let createPaths = ["notebooks:create", "contacts:create", "experiences:create", "transactions:create"]
            let createdId: String?
            if createPaths.contains(path) {
                createdId = (try? JSONSerialization.jsonObject(with: result, options: [.fragmentsAllowed])) as? String
                    ?? (try? JSONDecoder().decode(String.self, from: result))
            } else {
                createdId = nil
            }
            applyOfflineMutation(path, args: args, localCreatedId: createdId)
            persistOfflineSnapshot()
            return result
        } catch {
            if BackendError.isAuthenticationFailure(error) {
                isAuthenticated = false
                authError = error.localizedDescription
                throw error
            }
            guard BackendError.isRetryable(error) else { throw error }
            if BackendError.isConnectivityFailure(error) { isOnline = false }
            return try enqueueOfflineMutation(path, args: args)
        }
    }

    private func refreshAfterMutation() async {
        guard pendingMutations.isEmpty && isOnline else {
            persistOfflineSnapshot()
            return
        }
        await refreshDataAndReportError()
    }

    // Synchronous view callbacks forward work to the async backend operations below.
    public func createNotebook(name: String) { Task { await createNotebook(name: name) } }
    public func updateNotebook(id: String, name: String) { Task { await updateNotebook(id: id, name: name) } }
    public func archiveNotebook(id: String, archived: Bool) { Task { await archiveNotebook(id: id, archived: archived) } }
    public func reorderNotebooks(orderedIds: [String]) { Task { await reorderNotebooks(orderedIds: orderedIds) } }
    public func deleteNotebook(id: String) { Task { await deleteNotebook(id: id) } }

    public func createContact(notebookId: String, name: String, phone: String? = nil) {
        Task { await createContact(notebookId: notebookId, name: name, phone: phone) }
    }
    public func updateContact(id: String, name: String, phone: String? = nil) {
        Task { await updateContact(id: id, name: name, phone: phone) }
    }
    public func deleteContact(id: String) { Task { await deleteContact(id: id) } }

    public func createExperience(notebookId: String, name: String, contactId: String? = nil) {
        Task { await createExperience(notebookId: notebookId, name: name, contactId: contactId) }
    }
    public func updateExperience(id: String, name: String, contactId: String? = nil) {
        Task { await updateExperience(id: id, name: name, contactId: contactId) }
    }
    public func toggleExperienceClosed(id: String) { Task { await toggleExperienceClosed(id: id) } }
    public func transferExperience(id: String, to targetNotebookId: String) {
        Task { await transferExperience(id: id, to: targetNotebookId) }
    }
    public func deleteExperience(id: String) { Task { await deleteExperience(id: id) } }

    public func createTransaction(
        notebookId: String, contactId: String? = nil, experienceId: String? = nil,
        amount: Double, description: String? = nil, date: Date = Date()
    ) {
        Task {
            await createTransaction(
                notebookId: notebookId, contactId: contactId, experienceId: experienceId,
                amount: amount, description: description, date: date
            )
        }
    }
    public func updateTransaction(id: String, amount: Double, description: String? = nil, date: Date) {
        Task { await updateTransaction(id: id, amount: amount, description: description, date: date) }
    }
    public func deleteTransaction(id: String) { Task { await deleteTransaction(id: id) } }

    // MARK: - Notebook actions

    public func createNotebook(name: String) async {
        let trimmed = String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(20))
        guard !trimmed.isEmpty else { return }
        do {
            let data = try await runMutation("notebooks:create", args: ["name": trimmed])
            let id = try JSONDecoder().decode(String.self, from: data)
            activeNotebookId = id
            UserDefaults.standard.set(id, forKey: activeNotebookKey)
            await refreshAfterMutation()
        } catch {
            appError = error.localizedDescription
        }
    }

    public func updateNotebook(id: String, name: String) async {
        let trimmed = String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(20))
        guard !trimmed.isEmpty else { return }
        do {
            _ = try await runMutation("notebooks:update", args: ["id": id, "name": trimmed])
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    public func archiveNotebook(id: String, archived: Bool) async {
        do {
            _ = try await runMutation("notebooks:archive", args: ["id": id, "archived": archived])
            await refreshAfterMutation()
            if archived, activeNotebookId == id {
                activeNotebookId = activeNotebooksList.first?.id
            }
        } catch { appError = error.localizedDescription }
    }

    public func reorderNotebooks(orderedIds: [String]) async {
        do {
            _ = try await runMutation("notebooks:reorder", args: ["ids": orderedIds])
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    public func deleteNotebook(id: String) async {
        do {
            _ = try await runMutation("notebooks:remove", args: ["id": id])
            await refreshAfterMutation()
            if activeNotebookId == id {
                activeNotebookId = activeNotebooksList.first?.id
            }
        } catch { appError = error.localizedDescription }
    }

    // MARK: - Contact actions

    public func createContact(notebookId: String, name: String, phone: String? = nil) async {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanName.isEmpty else { return }
        do {
            var args: [String: Any] = ["notebookId": notebookId, "name": cleanName]
            let cleanPhone = phone?.trimmingCharacters(in: .whitespacesAndNewlines)
            if let cleanPhone, !cleanPhone.isEmpty { args["phone"] = cleanPhone }
            _ = try await runMutation("contacts:create", args: args)
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    public func updateContact(id: String, name: String, phone: String? = nil) async {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanName.isEmpty else { return }
        do {
            var args: [String: Any] = ["id": id, "name": cleanName]
            let cleanPhone = phone?.trimmingCharacters(in: .whitespacesAndNewlines)
            if let cleanPhone, !cleanPhone.isEmpty { args["phone"] = cleanPhone }
            _ = try await runMutation("contacts:update", args: args)
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    public func deleteContact(id: String) async {
        do {
            _ = try await runMutation("contacts:remove", args: ["id": id])
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    // MARK: - Experience actions

    public func createExperience(notebookId: String, name: String, contactId: String? = nil) async {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanName.isEmpty else { return }
        do {
            var args: [String: Any] = ["notebookId": notebookId, "name": cleanName]
            if let contactId, !contactId.isEmpty { args["contactId"] = contactId }
            _ = try await runMutation("experiences:create", args: args)
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    public func updateExperience(id: String, name: String, contactId: String? = nil) async {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanName.isEmpty else { return }
        do {
            var args: [String: Any] = ["id": id, "name": cleanName]
            if let contactId, !contactId.isEmpty { args["contactId"] = contactId }
            _ = try await runMutation("experiences:update", args: args)
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    public func toggleExperienceClosed(id: String) async {
        guard let experience = experiences.first(where: { $0.id == id }) else { return }
        do {
            _ = try await runMutation(experience.closed ? "experiences:reopen" : "experiences:close", args: ["id": id])
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    public func transferExperience(id: String, to targetNotebookId: String) async {
        do {
            _ = try await runMutation("experiences:transfer", args: ["id": id, "targetNotebookId": targetNotebookId])
            await refreshAfterMutation()
            if transferRedirect { activeNotebookId = targetNotebookId }
        } catch { appError = error.localizedDescription }
    }

    public func deleteExperience(id: String) async {
        do {
            _ = try await runMutation("experiences:remove", args: ["id": id])
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    // MARK: - Transaction actions

    public func createTransaction(
        notebookId: String,
        contactId: String? = nil,
        experienceId: String? = nil,
        amount: Double,
        description: String? = nil,
        date: Date = Date()
    ) async {
        guard abs(amount) > 0.0001 else { return }
        let cleanDescription = description?.trimmingCharacters(in: .whitespacesAndNewlines)
        var args: [String: Any] = [
            "notebookId": notebookId,
            "amount": amount,
            "date": date.timeIntervalSince1970 * 1000
        ]
        if let contactId, !contactId.isEmpty { args["contactId"] = contactId }
        if let experienceId, !experienceId.isEmpty { args["experienceId"] = experienceId }
        if let cleanDescription, !cleanDescription.isEmpty { args["description"] = cleanDescription }
        do {
            _ = try await runMutation("transactions:create", args: args)
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    public func updateTransaction(id: String, amount: Double, description: String? = nil, date: Date) async {
        guard abs(amount) > 0.0001 else { return }
        let cleanDescription = description?.trimmingCharacters(in: .whitespacesAndNewlines)
        var args: [String: Any] = ["id": id, "amount": amount, "date": date.timeIntervalSince1970 * 1000]
        if let cleanDescription, !cleanDescription.isEmpty { args["description"] = cleanDescription }
        do {
            _ = try await runMutation("transactions:update", args: args)
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    public func deleteTransaction(id: String) async {
        do {
            _ = try await runMutation("transactions:remove", args: ["id": id])
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    // MARK: - Search

    public struct SearchResults: Sendable {
        public let contacts: [Contact]
        public let experiences: [Experience]
        public let transactions: [Transaction]

        public init(contacts: [Contact] = [], experiences: [Experience] = [], transactions: [Transaction] = []) {
            self.contacts = contacts
            self.experiences = experiences
            self.transactions = transactions
        }

        public var isEmpty: Bool { contacts.isEmpty && experiences.isEmpty && transactions.isEmpty }
        public var totalCount: Int { contacts.count + experiences.count + transactions.count }
    }

    public func search(query: String) -> SearchResults {
        let query = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !query.isEmpty else { return SearchResults() }
        let notebookId = activeNotebook?.id
        let foundContacts = contacts.filter {
            ($0.notebookId == notebookId || notebookId == nil) &&
            ($0.name.lowercased().contains(query) || ($0.phone?.lowercased().contains(query) ?? false))
        }
        let foundExperiences = experiences.filter {
            ($0.notebookId == notebookId || notebookId == nil) && $0.name.lowercased().contains(query)
        }
        let foundTransactions = transactions.filter {
            ($0.notebookId == notebookId || notebookId == nil) &&
            (($0.description?.lowercased().contains(query) ?? false) || String(format: "%.2f", abs($0.amount)).contains(query))
        }
        return SearchResults(contacts: foundContacts, experiences: foundExperiences, transactions: foundTransactions)
    }

    // MARK: - Preferences

    private func loadSettings() {
        if let value = UserDefaults.standard.string(forKey: themeKey), let mode = AppThemeMode(rawValue: value) {
            themeMode = mode
        }
        if let value = UserDefaults.standard.string(forKey: languageKey), let selected = AppLanguage(rawValue: value) {
            language = selected
        }
        amountsHiddenByDefault = UserDefaults.standard.bool(forKey: amountsDefaultKey)
        isAmountsHidden = amountsHiddenByDefault
        transferRedirect = UserDefaults.standard.object(forKey: transferRedirectKey) as? Bool ?? true
        activeNotebookId = UserDefaults.standard.string(forKey: activeNotebookKey)
    }

    public func updateTheme(_ mode: AppThemeMode) {
        themeMode = mode
        UserDefaults.standard.set(mode.rawValue, forKey: themeKey)
    }

    public func updateLanguage(_ lang: AppLanguage) {
        language = lang
        UserDefaults.standard.set(lang.rawValue, forKey: languageKey)
    }

    public func updateAmountsHiddenDefault(_ hidden: Bool) {
        amountsHiddenByDefault = hidden
        UserDefaults.standard.set(hidden, forKey: amountsDefaultKey)
    }

    public func updateTransferRedirect(_ redirect: Bool) {
        transferRedirect = redirect
        UserDefaults.standard.set(redirect, forKey: transferRedirectKey)
    }

    public func selectNotebook(_ id: String) {
        activeNotebookId = id
        UserDefaults.standard.set(id, forKey: activeNotebookKey)
        persistOfflineSnapshot()
    }

    public func clearAppError() {
        appError = nil
    }
}


