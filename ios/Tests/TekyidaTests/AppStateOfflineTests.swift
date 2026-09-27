import XCTest
@testable import Tekyida

@MainActor
final class AppStateOfflineTests: XCTestCase {
    func testPendingSyncDetection() {
        let state = AppState()
        XCTAssertTrue(state.isItemPendingSync(id: "offline_abc123"))
        XCTAssertFalse(state.isItemPendingSync(id: "server_xyz789"))
    }

    func testOfflineAccountGuard() async {
        let state = AppState()
        state.isOnline = false

        do {
            try await state.changeEmail(to: "test@example.com")
            XCTFail("Should throw when offline")
        } catch {
            XCTAssertTrue(error.localizedDescription.contains("offline"))
        }

        do {
            try await state.changePassword(current: "oldpass123", new: "newpass123")
            XCTFail("Should throw when offline")
        } catch {
            XCTAssertTrue(error.localizedDescription.contains("offline"))
        }
    }

    func testArchivedNotebookSelectionAndPersistenceParity() {
        let state = AppState()
        let activeNb = Notebook(id: "nb_active", name: "Active Book", archived: false)
        let archivedNb = Notebook(id: "nb_archived", name: "Archived Book", archived: true)
        state.notebooks = [activeNb, archivedNb]

        // Default active is first non-archived
        XCTAssertEqual(state.activeNotebook?.id, "nb_active")

        // Selecting archived notebook allows viewing it in current session
        state.selectNotebook("nb_archived")
        XCTAssertEqual(state.activeNotebook?.id, "nb_archived")

        // But UserDefaults does NOT persist archived notebook ID
        XCTAssertNotEqual(UserDefaults.standard.string(forKey: "tekyida_active_notebook_id"), "nb_archived")

        // Selecting active notebook persists to UserDefaults
        state.selectNotebook("nb_active")
        XCTAssertEqual(UserDefaults.standard.string(forKey: "tekyida_active_notebook_id"), "nb_active")
    }

    func testTransferNotebookFiltering() {
        let state = AppState()
        let nb1 = Notebook(id: "nb1", name: "Current")
        let nb2 = Notebook(id: "nb2", name: "Active Other")
        let nb3 = Notebook(id: "nb3", name: "Archived Other", archived: true)
        state.notebooks = [nb1, nb2, nb3]

        let exp = Experience(notebookId: nb1.id, name: "Dinner")
        let activeTargets = state.activeNotebooksList.filter { $0.id != exp.notebookId }
        let archivedTargets = state.archivedNotebooksList.filter { $0.id != exp.notebookId }

        XCTAssertEqual(activeTargets.map(\.id), ["nb2"])
        XCTAssertEqual(archivedTargets.map(\.id), ["nb3"])
    }
}
