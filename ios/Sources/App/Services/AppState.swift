import SwiftUI
import Combine

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

    private let backend = ConvexBackend.shared
    private let activeNotebookKey = "tekyida_active_notebook_id"
    private let themeKey = "tekyida_theme_mode"
    private let languageKey = "tekyida_language"
    private let amountsDefaultKey = "tekyida_amounts_hidden_default"
    private let transferRedirectKey = "tekyida_transfer_redirect"

    public init() {
        ["tekyida_lock_enabled", "tekyida_lock_hash", "tekyida_lock_salt"]
            .forEach { UserDefaults.standard.removeObject(forKey: $0) }
        loadSettings()
        isAuthenticated = backend.hasSession
        guard isAuthenticated else {
            isLoading = false
            return
        }
        Task { await restoreSession() }
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
        do {
            let signedIn = try await backend.signIn(
                email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                password: password,
                name: name,
                flow: isRegistration ? "signUp" : "signIn"
            )
            if signedIn {
                isAwaitingEmailVerification = false
                await finishSignIn()
            } else {
                isAwaitingEmailVerification = true
            }
        } catch {
            authError = error.localizedDescription
        }
    }

    public func verifyEmail(email: String, code: String) async {
        authError = nil
        do {
            guard try await backend.verifyEmail(
            email: email.trimmingCharacters(in: .whitespacesAndNewlines),
            code: code.trimmingCharacters(in: .whitespacesAndNewlines)
        ) else {
                throw BackendError.message("The verification code was not accepted.")
            }
            isAwaitingEmailVerification = false
            await finishSignIn()
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
        await backend.signOut()
        isAuthenticated = false
        isAwaitingEmailVerification = false
        userEmail = ""
        authError = nil
        appError = nil
        notebooks = []
        contacts = []
        experiences = []
        transactions = []
        activeNotebookId = nil
        UserDefaults.standard.removeObject(forKey: activeNotebookKey)
    }

    public func refresh() async {
        guard isAuthenticated else { return }
        do {
            try await refreshData()
        } catch {
            if !backend.hasSession {
                isAuthenticated = false
                authError = error.localizedDescription
            } else {
                appError = error.localizedDescription
            }
        }
    }

    public func changeEmail(to email: String) async throws {
        let normalizedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        try await backend.actionVoid("users:changeEmail", args: ["newEmail": normalizedEmail])
        let updatedEmail: String? = try await backend.query("users:currentEmail")
        userEmail = updatedEmail ?? normalizedEmail
    }

    public func changePassword(current: String, new: String) async throws {
        try await backend.actionVoid(
            "users:changePassword",
            args: ["currentPassword": current, "newPassword": new]
        )
    }

    private func finishSignIn() async {
        isAuthenticated = true
        isLoading = true
        await restoreSession()
    }

    private func restoreSession() async {
        do {
            try await refreshData()
            isAuthenticated = true
        } catch {
            if backend.hasSession {
                isAuthenticated = true
                appError = error.localizedDescription
            } else {
                isAuthenticated = false
                authError = error.localizedDescription
                await backend.signOut()
            }
        }
        isLoading = false
    }

    private func refreshData() async throws {
        let loadedNotebooks: [Notebook] = try await backend.query("notebooks:list")
        notebooks = loadedNotebooks

        if activeNotebookId == nil || !loadedNotebooks.contains(where: { $0.id == activeNotebookId }) {
            activeNotebookId = loadedNotebooks.first(where: { !$0.archived })?.id
        }

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
                    "transactions:list",
                    args: ["contactId": contact.id]
                )
                loadedTransactions += contactTransactions
            }
            for experience in notebookExperiences {
                let experienceTransactions: [Transaction] = try await backend.query(
                    "transactions:list",
                    args: ["experienceId": experience.id]
                )
                loadedTransactions += experienceTransactions
            }
        }
        contacts = loadedContacts
        experiences = loadedExperiences
        transactions = loadedTransactions
        let email: String? = try await backend.query("users:currentEmail")
        userEmail = email ?? ""
    }

    private func runMutation(_ path: String, args: [String: Any] = [:]) async throws -> Data {
        try await backend.mutation(path, args: args)
    }

    private func refreshAfterMutation() async {
        do {
            try await refreshData()
            appError = nil
        } catch {
            appError = error.localizedDescription
        }
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
            let data = try await backend.mutation("notebooks:create", args: ["name": trimmed])
            let id = try JSONDecoder().decode(String.self, from: data)
            try await refreshData()
            activeNotebookId = id
            UserDefaults.standard.set(id, forKey: activeNotebookKey)
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
    }

    public func clearAppError() {
        appError = nil
    }
}


