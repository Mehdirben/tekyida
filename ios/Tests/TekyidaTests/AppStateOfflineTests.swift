import Testing
import Foundation
@testable import Tekyida

@Suite("AppState Offline Guards")
@MainActor
struct AppStateOfflineTests {
    private let backend: MockBackend
    private let state: AppState
    private let defaults: UserDefaults
    private let suiteName: String

    init() {
        backend = MockBackend()
        let isolated = TestSupport.makeIsolatedDefaults()
        defaults = isolated.defaults
        suiteName = isolated.suiteName
        state = AppState(
            backend: backend,
            offlineCache: TestSupport.makeTemporaryCache(),
            defaults: defaults,
            startSideEffects: false
        )
    }

    @Test("Offline-prefixed ids are detected as pending sync")
    func pendingSyncDetection() {
        #expect(state.isItemPendingSync(id: "offline_abc123"))
        #expect(!state.isItemPendingSync(id: "server_xyz789"))
    }

    @Test("Account mutations are refused while offline")
    func offlineAccountGuard() async {
        state.isOnline = false

        await #expect {
            try await state.changeEmail(to: "test@example.com")
        } throws: { error in
            error is BackendError && error.localizedDescription.contains("offline")
        }
        await #expect {
            try await state.changePassword(current: "oldpass123", new: "newpass123")
        } throws: { error in
            error is BackendError && error.localizedDescription.contains("offline")
        }
        #expect(backend.actionVoidCalls.isEmpty, "No request may reach the backend while offline")
    }

    @Test("Archived notebook selection is session-only, active persists")
    func archivedNotebookSelectionAndPersistenceParity() {
        let activeNb = Notebook(id: "nb_active", name: "Active Book", archived: false)
        let archivedNb = Notebook(id: "nb_archived", name: "Archived Book", archived: true)
        state.notebooks = [activeNb, archivedNb]

        #expect(state.activeNotebook?.id == "nb_active")

        state.selectNotebook("nb_archived")
        #expect(state.activeNotebook?.id == "nb_archived")

        #expect(defaults.string(forKey: "tekyida_active_notebook_id") != "nb_archived")

        state.selectNotebook("nb_active")
        #expect(defaults.string(forKey: "tekyida_active_notebook_id") == "nb_active")
    }

    @Test("Transfer targets exclude current notebook and archived notebooks")
    func transferNotebookFiltering() {
        let nb1 = Notebook(id: "nb1", name: "Current")
        let nb2 = Notebook(id: "nb2", name: "Active Other")
        let nb3 = Notebook(id: "nb3", name: "Archived Other", archived: true)
        state.notebooks = [nb1, nb2, nb3]

        let exp = Experience(notebookId: nb1.id, name: "Dinner")
        let activeTargets = state.activeNotebooksList.filter { $0.id != exp.notebookId }
        let archivedTargets = state.archivedNotebooksList.filter { $0.id != exp.notebookId }

        #expect(activeTargets.map(\.id) == ["nb2"])
        #expect(archivedTargets.map(\.id) == ["nb3"])
    }
}
