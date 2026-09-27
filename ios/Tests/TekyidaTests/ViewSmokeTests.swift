import Testing
import SwiftUI
@testable import Tekyida

@Suite("View Smoke Tests")
@MainActor
struct ViewSmokeTests {
    /// Renders a view through a hosting controller so the SwiftUI environment
    /// (`@EnvironmentObject`, etc.) resolves exactly as it does in the app.
    /// Calling `view.body` directly on environment-dependent views is fatal.
    private func render(_ view: some View) {
        let controller = UIHostingController(rootView: view)
        controller.loadViewIfNeeded()
    }

    @Test("ContentView renders in all auth/loading states")
    func contentViewInitialization() {
        let backend = MockBackend()
        let state = TestSupport.makeState(backend: backend)
        let view = ContentView(state: state)
        render(view)

        state.isAuthenticated = true
        render(view)
    }

    @Test("Scroll header, brand header, and sync banner render")
    func tekyidaScrollHeaderAndSyncBanner() {
        let state = TestSupport.makeState(backend: MockBackend())
        render(TekyidaScrollHeader(onManageNotebooks: {}).environmentObject(state))
        render(BrandLogoHeader().environmentObject(state))
        render(OfflineSyncBanner().environmentObject(state))
    }

    @Test("Search view and add sheets render")
    func searchViewAndAddSheetsBodies() {
        let state = TestSupport.makeState(backend: MockBackend())
        render(SearchView().environmentObject(state))

        render(AddContactSheet(onSave: { _, _ in }))
        render(AddExperienceSheet(contacts: [], onSave: { _, _ in }))

        var notebookId: String? = "nb_active"
        render(NotebookHeaderButton(
            notebooks: [Notebook(id: "nb_active", name: "Active")],
            activeNotebook: Notebook(id: "nb_active", name: "Active"),
            activeNotebookId: Binding(get: { notebookId }, set: { notebookId = $0 }),
            onManage: {}
        ))
    }

    @Test("Transfer experience sheet renders")
    func transferExperienceSheetBody() {
        let state = TestSupport.makeState(backend: MockBackend())
        let experience = Experience(notebookId: "nb1", name: "Dinner")
        render(TransferExperienceSheet(experience: experience, onTransfer: { _ in })
            .environmentObject(state))
    }

    @Test("Notebook manager sheet renders")
    func notebookManagerSheetBody() {
        let state = TestSupport.makeState(backend: MockBackend())
        render(NotebookManagerSheet().environmentObject(state))
    }
}
