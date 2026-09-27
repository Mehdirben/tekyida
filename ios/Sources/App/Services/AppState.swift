import SwiftUI
import Combine

/// Core observable state container: published data, settings, notebook
/// selection, and offline snapshot persistence.
///
/// The class is split across files by responsibility — all parts share the
/// same `AppState` type and public API:
///   - `AppState+Balances.swift`  balance math (delegates to `BalanceEngine`)
///   - `AppState+Search.swift`    search (delegates to `SearchEngine`)
///   - `AppState+Auth.swift`      sign in / verify / sign out / credentials
///   - `AppState+Actions.swift`   CRUD mutations (sync wrappers + async)
///   - `AppState+OfflineSync.swift` offline queue, refresh, and sync engine
///   - `AppState+OfflineApply.swift` optimistic local application of mutations
///   - `AppState+Preferences.swift` theme, language, and defaults
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
    // Setters are module-internal so the offline-sync extensions can update
    // them; views keep read-only access.
    @Published public internal(set) var isOnline = true
    @Published public internal(set) var isSyncing = false
    @Published public internal(set) var pendingSyncCount = 0

    // MARK: Module-internal dependencies shared by the AppState extensions.

    let backend = ConvexBackend.shared
    let offlineCache = OfflineCache()
    var pendingMutations: [QueuedMutation] = []
    var localToServerIds: [String: String] = [:]
    var isRefreshing = false
    var needsRefreshAgain = false
    var mutationGeneration = 0
    let connectivity = ConnectivityMonitor()

    let activeNotebookKey = "tekyida_active_notebook_id"
    let themeKey = "tekyida_theme_mode"
    let languageKey = "tekyida_language"
    let amountsDefaultKey = "tekyida_amounts_hidden_default"
    let transferRedirectKey = "tekyida_transfer_redirect"

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
        connectivity.cancel()
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
        if let id = activeNotebookId, let found = notebooks.first(where: { $0.id == id }) {
            return found
        }
        return notebooks.first(where: { !$0.archived })
    }

    public var activeNotebooksList: [Notebook] {
        notebooks.filter { !$0.archived }.sorted(by: notebookOrderSort)
    }

    public var archivedNotebooksList: [Notebook] {
        notebooks.filter { $0.archived }.sorted(by: notebookOrderSort)
    }

    func notebookOrderSort(_ first: Notebook, _ second: Notebook) -> Bool {
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

    // MARK: - Connectivity

    func startConnectivityMonitoring() {
        connectivity.onPathChange = { [weak self] online in
            guard let self else { return }
            let wasOnline = self.isOnline
            self.isOnline = online
            if !online && self.isLoading { self.isLoading = false }
            if online && !wasOnline && self.isAuthenticated { await self.syncAndRefresh() }
        }
        connectivity.onRetryTick = { [weak self] in
            guard let self else { return }
            if self.isOnline && self.isAuthenticated && !self.pendingMutations.isEmpty {
                await self.syncPendingMutations()
            }
        }
        connectivity.start()
    }

    // MARK: - Offline snapshot persistence

    func restoreLocalSnapshot(_ snapshot: OfflineSnapshot) {
        userEmail = snapshot.accountEmail
        pendingMutations = snapshot.pendingMutations
        localToServerIds = snapshot.localToServerIds
        pendingSyncCount = pendingMutations.count
        guard backend.hasSession else { return }
        notebooks = snapshot.notebooks
        contacts = snapshot.contacts
        experiences = snapshot.experiences
        transactions = snapshot.transactions
        // Parity with PWA: restore last non-archived notebook on app restart
        let savedId = UserDefaults.standard.string(forKey: activeNotebookKey)
        if let savedId, let found = notebooks.first(where: { $0.id == savedId && !$0.archived }) {
            activeNotebookId = found.id
        } else {
            activeNotebookId = notebooks.first(where: { !$0.archived })?.id
        }
    }

    func makeOfflineSnapshot() -> OfflineSnapshot {
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

    func persistOfflineSnapshot() {
        guard !normalizedEmail(userEmail).isEmpty else { return }
        do {
            try offlineCache.save(makeOfflineSnapshot())
        } catch {
            appError = "Could not save offline data: \(error.localizedDescription)"
        }
    }

    func clearCachedAccountData() {
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

    func normalizedEmail(_ value: String) -> String {
        value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    // MARK: - Notebook selection

    public func selectNotebook(_ id: String) {
        activeNotebookId = id
        if let nb = notebooks.first(where: { $0.id == id }), !nb.archived {
            UserDefaults.standard.set(id, forKey: activeNotebookKey)
        }
        persistOfflineSnapshot()
    }

    public func clearAppError() {
        appError = nil
    }
}
