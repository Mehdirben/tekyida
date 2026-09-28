import Testing
import Foundation
@testable import Tekyida

@Suite("AppState Core")
@MainActor
struct AppStateCoreTests {
    private let backend: MockBackend
    private let state: AppState

    init() {
        backend = MockBackend()
        state = TestSupport.makeState(backend: backend)
    }

    // MARK: - Sync status visibility

    @Test("shouldShowSyncStatus reflects the three visibility triggers")
    func shouldShowSyncStatus() {
        #expect(!state.shouldShowSyncStatus, "online, idle, empty queue hides the status")

        state.isSyncing = true
        #expect(state.shouldShowSyncStatus)

        state.isSyncing = false
        state.isOnline = false
        #expect(state.shouldShowSyncStatus)

        state.isOnline = true
        state.pendingSyncCount = 2
        #expect(state.shouldShowSyncStatus)
    }

    // MARK: - Pending-sync detection

    @Test("isItemPendingSync inspects queued mutation arguments")
    func pendingSyncByQueuedId() throws {
        let mutation = QueuedMutation(
            functionPath: "contacts:update",
            arguments: try JSONSerialization.data(withJSONObject: ["id": "srv_9", "name": "X"]),
            localCreatedId: nil,
            accountEmail: "user@tekyida.app"
        )
        state.pendingMutations = [mutation]

        #expect(state.isItemPendingSync(id: "srv_9"), "ids inside queued arguments are pending")
        #expect(!state.isItemPendingSync(id: "srv_other"))
    }

    @Test("isItemPendingSync matches queued create ids")
    func pendingSyncByLocalCreatedId() throws {
        let mutation = QueuedMutation(
            functionPath: "contacts:create",
            arguments: try JSONSerialization.data(withJSONObject: ["name": "X"]),
            localCreatedId: "offline_77",
            accountEmail: "user@tekyida.app"
        )
        state.pendingMutations = [mutation]

        #expect(state.isItemPendingSync(id: "offline_77"))
        #expect(state.isItemPendingSync(id: "offline_arbitrary"), "any offline_ prefix reads as pending")
    }

    @Test("Queued mutations with unreadable arguments never match ids")
    func pendingSyncWithCorruptArguments() throws {
        state.pendingMutations = [QueuedMutation(
            functionPath: "contacts:update",
            arguments: Data("not-json".utf8),
            localCreatedId: nil,
            accountEmail: "user@tekyida.app"
        )]

        #expect(!state.isItemPendingSync(id: "srv_1"))
    }

    @Test("Offline snapshot persistence failures surface appError")
    func snapshotPersistFailure() throws {
        // A file occupying the cache directory path makes every write fail.
        let blocker = TestSupport.temporaryDirectory().appendingPathComponent("blocker")
        try Data("blocked".utf8).write(to: blocker)
        let blockedCache = OfflineCache(directory: blocker)

        let failingState = AppState(
            backend: backend,
            offlineCache: blockedCache,
            defaults: TestSupport.makeIsolatedDefaults().defaults,
            startSideEffects: false
        )
        failingState.userEmail = "user@tekyida.app"

        failingState.persistOfflineSnapshot()

        #expect(failingState.appError?.contains("Could not save offline data") == true)
    }

    // MARK: - Notebook ordering

    @Test("Notebook ordering: explicit order first, creation date as tiebreak")
    func notebookOrdering() {
        let older = Notebook(name: "A", order: nil, createdAt: Date(timeIntervalSince1970: 1_000))
        let newer = Notebook(name: "B", order: nil, createdAt: Date(timeIntervalSince1970: 2_000))
        #expect(state.notebookOrderSort(newer, older), "no orders: newer first")

        let orderedFirst = Notebook(name: "C", order: 0)
        let orderedSecond = Notebook(name: "D", order: 1)
        #expect(state.notebookOrderSort(orderedFirst, orderedSecond))
        #expect(!state.notebookOrderSort(orderedSecond, orderedFirst))

        let withOrder = Notebook(name: "E", order: 5)
        let withoutOrder = Notebook(name: "F", order: nil)
        #expect(state.notebookOrderSort(withOrder, withoutOrder), "ordered notebooks sort before unordered")
        #expect(!state.notebookOrderSort(withoutOrder, withOrder))

        let equalOrderA = Notebook(name: "G", order: 3, createdAt: Date(timeIntervalSince1970: 1_000))
        let equalOrderB = Notebook(name: "H", order: 3, createdAt: Date(timeIntervalSince1970: 2_000))
        #expect(state.notebookOrderSort(equalOrderB, equalOrderA), "equal orders fall back to creation date")
    }

    @Test("Active notebook falls back to the first non-archived notebook")
    func activeNotebookFallback() {
        let archived = Notebook(id: "arch", name: "Old", archived: true)
        let active = Notebook(id: "live", name: "Current")
        state.notebooks = [archived, active]

        #expect(state.activeNotebook?.id == "live")
        #expect(state.activeNotebooksList.map(\.id) == ["live"])
        #expect(state.archivedNotebooksList.map(\.id) == ["arch"])

        state.notebooks = [archived]
        #expect(state.activeNotebook == nil, "archived notebooks are never the fallback")
    }

    // MARK: - Misc

    @Test("Emails are normalized for account comparisons")
    func normalizedEmail() {
        #expect(state.normalizedEmail("  User@Tekyida.APP \n") == "user@tekyida.app")
    }

    @Test("clearAppError resets the alert binding")
    func clearAppError() {
        state.appError = "Something broke"
        state.clearAppError()
        #expect(state.appError == nil)
    }

    @Test("Offline snapshots persist and restore full account data")
    func snapshotRoundTrip() throws {
        backend.hasSession = true
        let cache = TestSupport.makeTemporaryCache()
        let defaults = TestSupport.makeIsolatedDefaults()
        let source = AppState(
            backend: backend,
            offlineCache: cache,
            defaults: defaults.defaults,
            startSideEffects: false
        )
        source.userEmail = "User@Tekyida.App"
        source.isAuthenticated = true
        // Fixed epoch dates: the snapshot JSON stores millisecond precision,
        // so wall-clock `Date()` fixtures would not survive the round trip.
        let epoch = Date(timeIntervalSince1970: 1_700_000_000)
        let notebook = Notebook(id: "nb1", name: "Main", createdAt: epoch)
        source.notebooks = [notebook]
        source.contacts = [Contact(id: "c1", notebookId: "nb1", name: "Alice", createdAt: epoch)]
        source.experiences = [Experience(id: "e1", notebookId: "nb1", name: "Dinner", createdAt: epoch)]
        source.transactions = [Transaction(id: "t1", notebookId: "nb1", contactId: "c1", amount: 12,
                                           date: epoch, createdAt: epoch)]
        source.pendingMutations = [QueuedMutation(
            functionPath: "contacts:create",
            arguments: try JSONSerialization.data(withJSONObject: ["name": "Bob"]),
            localCreatedId: "offline_9",
            accountEmail: "user@tekyida.app"
        )]
        source.pendingSyncCount = 1
        source.selectNotebook("nb1")

        let restored = AppState(
            backend: backend,
            offlineCache: cache,
            defaults: defaults.defaults,
            startSideEffects: false
        )

        #expect(restored.userEmail == "user@tekyida.app", "snapshot email is normalized")
        #expect(restored.notebooks == source.notebooks)
        #expect(restored.contacts == source.contacts)
        #expect(restored.experiences == source.experiences)
        #expect(restored.transactions == source.transactions)
        #expect(restored.pendingMutations.count == 1)
        #expect(restored.pendingSyncCount == 1)
        #expect(restored.localToServerIds == source.localToServerIds)
        #expect(restored.activeNotebookId == "nb1", "non-archived selection persists across restarts")
        #expect(restored.isLoading == false)
    }

    @Test("Snapshot restore falls back to the first non-archived notebook")
    func snapshotRestoreWithoutSavedSelection() throws {
        backend.hasSession = true
        let cache = TestSupport.makeTemporaryCache()
        let defaults = TestSupport.makeIsolatedDefaults()
        let source = AppState(
            backend: backend,
            offlineCache: cache,
            defaults: defaults.defaults,
            startSideEffects: false
        )
        source.userEmail = "user@tekyida.app"
        source.isAuthenticated = true
        let archived = Notebook(id: "arch", name: "Old", archived: true)
        let live = Notebook(id: "live", name: "Current")
        source.notebooks = [archived, live]
        source.persistOfflineSnapshot()

        // Fresh defaults: no saved selection → restore must fall back to the
        // first non-archived notebook in the snapshot.
        let freshDefaults = TestSupport.makeIsolatedDefaults()
        let restored = AppState(
            backend: backend,
            offlineCache: cache,
            defaults: freshDefaults.defaults,
            startSideEffects: false
        )

        #expect(restored.activeNotebookId == "live")
        #expect(restored.notebooks == source.notebooks)
    }

    @Test("Production initialization with a session spawns the restore task")
    func productionInitializationWithSession() async {
        backend.hasSession = true
        let productionState = AppState(
            backend: backend,
            offlineCache: TestSupport.makeTemporaryCache(),
            defaults: TestSupport.makeIsolatedDefaults().defaults,
            startSideEffects: true
        )

        #expect(productionState.isAuthenticated)
        await TestSupport.waitOnMainActor(until: { !productionState.isLoading }, timeout: 3)

        let notebooksAfterRestore = productionState.notebooks
        #expect(notebooksAfterRestore.isEmpty, "unseeded backend yields empty lists without errors")
    }
}
