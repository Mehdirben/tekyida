import Testing
import SwiftUI
@testable import Tekyida

@Suite("View Smoke Tests")
@MainActor
struct ViewSmokeTests {
    @Test("ContentView body evaluates in all auth/loading states")
    func contentViewInitialization() {
        let backend = MockBackend()
        let state = TestSupport.makeState(backend: backend)
        let view = ContentView(state: state)
        _ = view.body

        state.isAuthenticated = true
        _ = view.body
    }

    @Test("Scroll header, brand header, and sync banner bodies evaluate")
    func tekyidaScrollHeaderAndSyncBanner() {
        let state = TestSupport.makeState(backend: MockBackend())
        let header = TekyidaScrollHeader(onManageNotebooks: {})
            .environmentObject(state)
        _ = header.body

        let brand = BrandLogoHeader()
            .environmentObject(state)
        _ = brand.body

        let banner = OfflineSyncBanner()
            .environmentObject(state)
        _ = banner.body
    }

    @Test("Search view and add-sheet bodies evaluate")
    func searchViewAndAddSheetsBodies() {
        let state = TestSupport.makeState(backend: MockBackend())
        let searchView = SearchView().environmentObject(state)
        _ = searchView.body

        let addContact = AddContactSheet(onSave: { _, _ in })
        _ = addContact.body

        let addExperience = AddExperienceSheet(contacts: [], onSave: { _, _ in })
        _ = addExperience.body

        var notebookId: String? = "nb_active"
        let headerButton = NotebookHeaderButton(
            notebooks: [Notebook(id: "nb_active", name: "Active")],
            activeNotebook: Notebook(id: "nb_active", name: "Active"),
            activeNotebookId: Binding(get: { notebookId }, set: { notebookId = $0 }),
            onManage: {}
        )
        _ = headerButton.body
    }

    @Test("Transfer experience sheet body evaluates")
    func transferExperienceSheetBody() {
        let state = TestSupport.makeState(backend: MockBackend())
        let experience = Experience(notebookId: "nb1", name: "Dinner")
        let sheet = TransferExperienceSheet(experience: experience, onTransfer: { _ in })
            .environmentObject(state)
        _ = sheet.body
    }

    @Test("Notebook manager sheet body evaluates")
    func notebookManagerSheetBody() {
        let state = TestSupport.makeState(backend: MockBackend())
        let sheet = NotebookManagerSheet()
            .environmentObject(state)
        _ = sheet.body
    }
}
