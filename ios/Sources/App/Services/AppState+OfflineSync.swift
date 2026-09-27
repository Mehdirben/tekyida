import Foundation

// MARK: - Offline Sync Engine
// Refresh pipeline, the offline mutation queue (enqueue + optimistic apply),
// and the sync loop that drains the queue against the backend.
extension AppState {
    public func refresh() async {
        guard isAuthenticated, isOnline else { return }
        await syncAndRefresh()
    }

    func refreshData() async throws {
        let generationAtStart = mutationGeneration
        let loadedNotebooks: [Notebook] = try await backend.query("notebooks:list", args: [:])
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

        let email: String? = try await backend.query("users:currentEmail", args: [:])
        let loadedEmail = normalizedEmail(email ?? userEmail)
        if pendingMutations.contains(where: { normalizedEmail($0.accountEmail) != loadedEmail }) {
            throw BackendError.message("Pending offline changes belong to another account. Sign in to that account to sync them.")
        }

        guard generationAtStart == mutationGeneration else { return }
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

    func applyPendingMutationsOptimistically() {
        for mutation in pendingMutations {
            guard let raw = try? JSONSerialization.jsonObject(with: mutation.arguments),
                  let args = raw as? [String: Any] else { continue }
            let resolved = replaceLocalIds(in: args) as? [String: Any] ?? args
            applyOfflineMutation(mutation.functionPath, args: resolved, localCreatedId: mutation.localCreatedId)
        }
    }

    func replaceLocalIds(in value: Any) -> Any {
        if let string = value as? String { return localToServerIds[string] ?? string }
        if let dictionary = value as? [String: Any] {
            return dictionary.mapValues { replaceLocalIds(in: $0) }
        }
        if let array = value as? [Any] { return array.map { replaceLocalIds(in: $0) } }
        return value
    }

    func enqueueOfflineMutation(_ path: String, args: [String: Any]) throws -> Data {
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

    func refreshDataAndReportError() async {
        if isRefreshing {
            needsRefreshAgain = true
            return
        }
        isRefreshing = true
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
        isRefreshing = false
        if needsRefreshAgain {
            needsRefreshAgain = false
            await refreshDataAndReportError()
        }
    }

    func syncAndRefresh() async {
        guard isAuthenticated, isOnline else { return }
        if pendingMutations.isEmpty {
            await refreshDataAndReportError()
        } else {
            await syncPendingMutations()
        }
    }

    func syncPendingMutations() async {
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
                mutationGeneration += 1
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

    func runMutation(_ path: String, args: [String: Any] = [:]) async throws -> Data {
        guard isAuthenticated else { throw BackendError.message("Sign in to change your data.") }
        if !pendingMutations.isEmpty || !isOnline {
            return try enqueueOfflineMutation(path, args: args)
        }
        mutationGeneration += 1
        let createPaths = ["notebooks:create", "contacts:create", "experiences:create", "transactions:create"]
        let appliedOptimistically = !createPaths.contains(path)
        if appliedOptimistically {
            applyOfflineMutation(path, args: args, localCreatedId: nil)
        }
        do {
            let result = try await backend.mutation(path, args: args)
            if createPaths.contains(path) {
                let createdId = (try? JSONSerialization.jsonObject(with: result, options: [.fragmentsAllowed])) as? String
                    ?? (try? JSONDecoder().decode(String.self, from: result))
                applyOfflineMutation(path, args: args, localCreatedId: createdId)
            }
            persistOfflineSnapshot()
            return result
        } catch {
            if BackendError.isAuthenticationFailure(error) {
                isAuthenticated = false
                authError = error.localizedDescription
                throw error
            }
            guard BackendError.isRetryable(error) else {
                if appliedOptimistically {
                    await refreshDataAndReportError()
                }
                throw error
            }
            if BackendError.isConnectivityFailure(error) { isOnline = false }
            return try enqueueOfflineMutation(path, args: args)
        }
    }

    func refreshAfterMutation() async {
        guard pendingMutations.isEmpty && isOnline else {
            persistOfflineSnapshot()
            return
        }
        await refreshDataAndReportError()
    }
}
