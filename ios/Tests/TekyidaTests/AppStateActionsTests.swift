import Testing
import Foundation
@testable import Tekyida

@Suite("AppState CRUD Actions")
@MainActor
struct AppStateActionsTests {
    private let backend: MockBackend
    private let state: AppState

    init() throws {
        backend = MockBackend()
        state = TestSupport.makeSignedInState(backend: backend)
        try backend.seedDefaultRefreshData()
    }

    // MARK: - Notebooks

    @Test("createNotebook posts the mutation, selects and persists the new id")
    func createNotebookOnline() async throws {
        try backend.setQuery("notebooks:list", value: [Notebook(id: "srv_nb1", name: "Trips")])
        backend.setMutationJSON("notebooks:create", "\"srv_nb1\"")

        await state.createNotebook(name: "  Trips  ")

        #expect(backend.mutationCalls.map(\.path) == ["notebooks:create"])
        #expect(backend.mutationCalls.first?.args["name"] as? String == "Trips")
        #expect(state.activeNotebookId == "srv_nb1")
        #expect(state.appError == nil)
        #expect(backend.queryCalls.map(\.path).contains("notebooks:list"), "refresh must follow the mutation")
    }

    @Test("createNotebook trims to 20 characters and ignores empty names")
    func createNotebookValidation() async throws {
        backend.setMutationJSON("notebooks:create", "\"srv_x\"")
        await state.createNotebook(name: String(repeating: "x", count: 30))
        #expect(backend.mutationCalls.count == 1)
        #expect((backend.mutationCalls.first?.args["name"] as? String)?.count == 20)

        backend.clearRecordedCalls()
        await state.createNotebook(name: "   ")
        #expect(backend.mutationCalls.isEmpty, "blank names must be a no-op")
    }

    @Test("updateNotebook and deleteNotebook post mutations online")
    func updateAndDeleteNotebook() async {
        await state.updateNotebook(id: "nb1", name: "Renamed")
        #expect(backend.mutationCalls.last?.path == "notebooks:update")
        #expect(backend.mutationCalls.last?.args["id"] as? String == "nb1")

        await state.deleteNotebook(id: "nb1")
        #expect(backend.mutationCalls.last?.path == "notebooks:remove")
    }

    @Test("archiveNotebook falls back to the next active notebook")
    func archiveNotebookFallback() async throws {
        let kept = Notebook(id: "nb_keep", name: "Keep")
        let archived = Notebook(id: "nb_bye", name: "Bye", archived: true)
        try backend.setQuery("notebooks:list", value: [kept, archived])
        state.notebooks = [kept, Notebook(id: "nb_bye", name: "Bye")]
        state.activeNotebookId = "nb_bye"

        await state.archiveNotebook(id: "nb_bye", archived: true)

        #expect(backend.mutationCalls.first?.path == "notebooks:archive")
        #expect(state.activeNotebookId == "nb_keep")
        #expect(state.defaults.string(forKey: "tekyida_active_notebook_id") != "nb_bye",
                "the archived notebook must never persist as the active selection")
    }

    @Test("reorderNotebooks applies the order locally before syncing")
    func reorderNotebooks() async throws {
        let a = Notebook(id: "a", name: "A")
        let b = Notebook(id: "b", name: "B")
        state.notebooks = [a, b]
        try backend.setQuery("notebooks:list", value: [
            Notebook(id: "b", name: "B", order: 0),
            Notebook(id: "a", name: "A", order: 1)
        ])

        await state.reorderNotebooks(orderedIds: ["b", "a"])

        #expect(state.notebooks.first(where: { $0.id == "b" })?.order == 0)
        #expect(state.notebooks.first(where: { $0.id == "a" })?.order == 1)
        #expect(backend.mutationCalls.first?.path == "notebooks:reorder")
        #expect(backend.mutationCalls.first?.args["ids"] as? [String] == ["b", "a"])
    }

    // MARK: - Contacts

    @Test("createContact includes phone only when non-empty")
    func createContactOnline() async {
        await state.createContact(notebookId: "nb1", name: " Alice ", phone: "  ")
        #expect(backend.mutationCalls.first?.path == "contacts:create")
        #expect(backend.mutationCalls.first?.args["name"] as? String == "Alice")
        #expect(backend.mutationCalls.first?.args["phone"] == nil, "blank phone must be omitted")

        await state.createContact(notebookId: "nb1", name: "Bob", phone: " 0600 ")
        #expect(backend.mutationCalls.last?.args["phone"] as? String == "0600")
    }

    @Test("updateContact and deleteContact post mutations online")
    func updateAndDeleteContact() async {
        await state.updateContact(id: "c1", name: "New")
        #expect(backend.mutationCalls.last?.path == "contacts:update")

        await state.deleteContact(id: "c1")
        #expect(backend.mutationCalls.last?.path == "contacts:remove")
    }

    // MARK: - Experiences

    @Test("toggleExperienceClosed closes an open experience")
    func toggleExperienceClose() async {
        state.experiences = [Experience(id: "e1", notebookId: "nb1", name: "Open")]

        await state.toggleExperienceClosed(id: "e1")

        #expect(backend.mutationCalls.last?.path == "experiences:close")
    }

    @Test("toggleExperienceClosed reopens a closed experience")
    func toggleExperienceReopen() async {
        state.experiences = [Experience(id: "e2", notebookId: "nb1", name: "Done", closed: true)]

        await state.toggleExperienceClosed(id: "e2")

        #expect(backend.mutationCalls.last?.path == "experiences:reopen")
    }

    @Test("transferExperience redirects to the target notebook when enabled")
    func transferExperienceRedirect() async throws {
        // Seed the server notebooks so the post-mutation refresh keeps the
        // active selection instead of resetting it to an empty list's first.
        try backend.setQuery("notebooks:list", value: [
            Notebook(id: "nb2", name: "Two"),
            Notebook(id: "nb3", name: "Three")
        ])
        state.transferRedirect = true
        await state.transferExperience(id: "e1", to: "nb2")
        #expect(backend.mutationCalls.last?.path == "experiences:transfer")
        #expect(state.activeNotebookId == "nb2")

        state.transferRedirect = false
        await state.transferExperience(id: "e1", to: "nb3")
        #expect(state.activeNotebookId == "nb2", "redirect disabled must keep the current notebook")
    }

    // MARK: - Transactions

    @Test("createTransaction posts epoch-millisecond dates and skips zero amounts")
    func createTransaction() async throws {
        let date = Date(timeIntervalSince1970: 1_700_000_050)
        await state.createTransaction(notebookId: "nb1", amount: 120, description: "Taxi", date: date)

        let args = try #require(backend.mutationCalls.first?.args)
        #expect(args["amount"] as? Double == 120)
        #expect(args["date"] as? Double == 1_700_000_050_000)
        #expect(args["description"] as? String == "Taxi")

        backend.clearRecordedCalls()
        await state.createTransaction(notebookId: "nb1", amount: 0, date: date)
        await state.createTransaction(notebookId: "nb1", amount: 0.00005, date: date)
        #expect(backend.mutationCalls.isEmpty, "zero-amount transactions must be a no-op")
    }

    @Test("updateTransaction and deleteTransaction post mutations online")
    func updateAndDeleteTransaction() async {
        let date = Date(timeIntervalSince1970: 1_700_000_000)
        await state.updateTransaction(id: "t1", amount: 5, description: nil, date: date)
        #expect(backend.mutationCalls.last?.path == "transactions:update")

        await state.deleteTransaction(id: "t1")
        #expect(backend.mutationCalls.last?.path == "transactions:remove")
    }

    // MARK: - Offline and failure paths

    @Test("Mutations queue optimistically while offline")
    func mutationQueuedWhileOffline() async {
        state.isOnline = false

        await state.createContact(notebookId: "nb1", name: "Offline Alice")

        #expect(backend.mutationCalls.isEmpty, "offline mutations must not hit the backend")
        #expect(state.pendingSyncCount == 1)
        #expect(state.contacts.first?.name == "Offline Alice", "applied optimistically")
        #expect(state.contacts.first?.id.hasPrefix("offline_") == true)
    }

    @Test("Retryable failures fall back to the offline queue")
    func retryableFailureFallsBackToQueue() async {
        backend.setMutationError("contacts:create", BackendError.networkUnavailable("Connection lost"))

        await state.createContact(notebookId: "nb1", name: "Alice")

        #expect(state.isOnline == false, "connectivity failure must flip the online flag")
        #expect(state.pendingSyncCount == 1, "retryable failures must enqueue")
        #expect(backend.queryCalls.isEmpty, "no refresh when the queue is non-empty")
    }

    @Test("Authentication failures sign the user out and surface the error")
    func authenticationFailureSignsOut() async {
        backend.setMutationError("contacts:create", BackendError.authenticationRequired("Session expired"))

        await state.createContact(notebookId: "nb1", name: "Alice")

        #expect(state.isAuthenticated == false)
        #expect(state.authError == "Session expired")
        #expect(state.pendingSyncCount == 0, "auth failures must not enqueue")
    }

    @Test("Fatal mutation errors surface appError and skip the queue")
    func fatalFailureSurfacesError() async {
        backend.setMutationError("contacts:create", BackendError.message("Name taken"))
        state.contacts = [Contact(id: "c0", notebookId: "nb1", name: "Existing")]

        await state.createContact(notebookId: "nb1", name: "Alice")

        #expect(state.appError == "Name taken")
        #expect(state.pendingSyncCount == 0)
    }

    @Test("Fatal errors on optimistic updates roll back via refresh")
    func fatalUpdateErrorRefreshes() async {
        backend.setMutationError("contacts:update", BackendError.message("Conflict"))
        state.contacts = [Contact(id: "c1", notebookId: "nb1", name: "Original")]

        await state.updateContact(id: "c1", name: "Changed")

        #expect(state.appError == "Conflict")
        #expect(state.pendingSyncCount == 0, "fatal updates never enqueue")
        #expect(backend.queryCalls.map(\.path).contains("notebooks:list"),
                "optimistically-applied updates roll back through a refresh")
    }
}
