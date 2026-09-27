import Testing
import Foundation
@testable import Tekyida

@Suite("AppState Connectivity Wiring")
@MainActor
struct AppStateConnectivityTests {
    private let backend: MockBackend
    private let state: AppState

    init() throws {
        backend = MockBackend()
        state = TestSupport.makeSignedInState(backend: backend)
        try backend.seedDefaultRefreshData()
    }

    @Test("refresh() pulls data when authenticated and online")
    func refreshHappyPath() async {
        await state.refresh()

        #expect(backend.queryCalls.map(\.path).contains("notebooks:list"))
        #expect(state.appError == nil)
    }

    @Test("Monitoring wires callbacks without crashing")
    func monitoringStarts() {
        state.startConnectivityMonitoring()
        state.connectivity.cancel()
    }

    @Test("Going offline clears the loading state")
    func pathChangeOffline() async {
        state.startConnectivityMonitoring()
        state.isLoading = true

        await state.connectivity.onPathChange?(false)

        #expect(state.isOnline == false)
        #expect(state.isLoading == false, "offline must break the loading spinner")
    }

    @Test("Reconnecting syncs queued offline changes")
    func pathChangeReconnectSyncs() async throws {
        state.startConnectivityMonitoring()
        state.isOnline = false
        _ = try state.enqueueOfflineMutation("contacts:create", args: ["notebookId": "nb1", "name": "Alice"])
        backend.setMutationJSON("contacts:create", "\"srv_c1\"")

        await state.connectivity.onPathChange?(true)

        #expect(state.isOnline == true)
        #expect(state.pendingSyncCount == 0, "reconnect must drain the offline queue")
        #expect(backend.mutationCalls.map(\.path) == ["contacts:create"])
    }

    @Test("Retry ticks sync pending changes while online")
    func retryTickSyncs() async throws {
        state.startConnectivityMonitoring()
        state.pendingMutations = [QueuedMutation(
            functionPath: "contacts:create",
            arguments: try JSONSerialization.data(withJSONObject: ["notebookId": "nb1", "name": "Bob"]),
            localCreatedId: nil,
            accountEmail: "user@tekyida.app"
        )]
        state.pendingSyncCount = 1
        backend.setMutationJSON("contacts:create", "\"srv_c2\"")

        await state.connectivity.onRetryTick?()

        #expect(state.pendingSyncCount == 0)
    }

    @Test("Production initialization with side effects boots signed out cleanly")
    func productionInitialization() {
        let productionState = AppState(
            backend: MockBackend(),
            offlineCache: TestSupport.makeTemporaryCache(),
            defaults: TestSupport.makeIsolatedDefaults().defaults,
            startSideEffects: true
        )

        #expect(productionState.isAuthenticated == false)
        #expect(productionState.isLoading == false)
    }
}
