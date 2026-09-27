import Testing
import Foundation
@testable import Tekyida

@Suite("AppState Offline Apply Rules")
@MainActor
struct AppStateOfflineApplyTests {
    private let backend = MockBackend()
    private let state: AppState

    init() {
        state = TestSupport.makeSignedInState(backend: backend)
    }

    private func apply(_ path: String, _ args: [String: Any], localId: String? = nil) {
        state.applyOfflineMutation(path, args: args, localCreatedId: localId)
    }

    @Test("notebooks:create inserts at the top and can become active")
    func notebookCreate() {
        apply("notebooks:create", ["name": "Trip"], localId: "offline_nb")
        #expect(state.notebooks.first?.id == "offline_nb")
        #expect(state.activeNotebookId == "offline_nb", "first created notebook becomes active")

        state.activeNotebookId = "other"
        apply("notebooks:create", ["name": "Second"], localId: "offline_nb2")
        #expect(state.notebooks.count == 2)
        #expect(state.activeNotebookId == "other", "existing selection is kept")
    }

    @Test("notebooks:update renames existing notebooks and ignores unknown ids")
    func notebookUpdate() {
        state.notebooks = [Notebook(id: "nb1", name: "Old")]
        apply("notebooks:update", ["id": "nb1", "name": "New"])
        #expect(state.notebooks[0].name == "New")

        apply("notebooks:update", ["id": "ghost", "name": "New"])
        apply("notebooks:update", ["name": "NoId"])
        #expect(state.notebooks.count == 1)
    }

    @Test("notebooks:archive toggles archived and falls back to another active notebook")
    func notebookArchive() {
        state.notebooks = [Notebook(id: "nb1", name: "One"), Notebook(id: "nb2", name: "Two")]
        state.activeNotebookId = "nb1"

        apply("notebooks:archive", ["id": "nb1", "archived": true])
        #expect(state.notebooks.first(where: { $0.id == "nb1" })?.archived == true)
        #expect(state.activeNotebookId == "nb2", "archiving the active notebook must fall back")

        apply("notebooks:archive", ["id": "nb1", "archived": false])
        #expect(state.notebooks.first(where: { $0.id == "nb1" })?.archived == false)
    }

    @Test("notebooks:remove cascades to children and fixes the selection")
    func notebookRemove() {
        state.notebooks = [Notebook(id: "nb1", name: "One"), Notebook(id: "nb2", name: "Two")]
        state.contacts = [Contact(id: "c1", notebookId: "nb1", name: "Alice")]
        state.experiences = [Experience(id: "e1", notebookId: "nb1", name: "Dinner")]
        state.transactions = [Transaction(id: "t1", notebookId: "nb1", contactId: "c1", amount: 10)]
        state.activeNotebookId = "nb1"

        apply("notebooks:remove", ["id": "nb1"])

        #expect(state.notebooks.map(\.id) == ["nb2"])
        #expect(state.contacts.isEmpty)
        #expect(state.experiences.isEmpty)
        #expect(state.transactions.isEmpty)
        #expect(state.activeNotebookId == "nb2")
    }

    @Test("notebooks:reorder assigns orders by id index")
    func notebookReorder() {
        state.notebooks = [Notebook(id: "a", name: "A"), Notebook(id: "b", name: "B")]
        apply("notebooks:reorder", ["ids": ["b", "a"]])
        #expect(state.notebooks.first(where: { $0.id == "b" })?.order == 0)
        #expect(state.notebooks.first(where: { $0.id == "a" })?.order == 1)
    }

    @Test("contacts:create/update/remove apply with cascades")
    func contactLifecycle() {
        state.experiences = [Experience(id: "e1", notebookId: "nb1", contactId: "c1", name: "Trip")]
        state.transactions = [Transaction(id: "t1", notebookId: "nb1", contactId: "c1", amount: 5)]

        apply("contacts:create", ["notebookId": "nb1", "name": "Alice", "phone": "123"], localId: "offline_c1")
        #expect(state.contacts.first?.id == "offline_c1")
        #expect(state.contacts.first?.phone == "123")

        apply("contacts:update", ["id": "offline_c1", "name": "Alicia", "phone": "456"])
        #expect(state.contacts[0].name == "Alicia")
        #expect(state.contacts[0].phone == "456")

        apply("contacts:remove", ["id": "offline_c1"])
        #expect(state.contacts.isEmpty)
        #expect(state.transactions.isEmpty, "transactions of a removed contact must cascade")
        #expect(state.experiences[0].contactId == nil, "experience link must be cleared")
    }

    @Test("experiences lifecycle: create, update, close/reopen, transfer, remove")
    func experienceLifecycle() {
        state.notebooks = [Notebook(id: "nb1", name: "Main"), Notebook(id: "nb2", name: "Other")]

        apply("experiences:create", ["notebookId": "nb1", "name": "Dinner", "contactId": "c1"], localId: "offline_e1")
        #expect(state.experiences.first?.id == "offline_e1")

        apply("experiences:update", ["id": "offline_e1", "name": "Feast", "contactId": nil])
        #expect(state.experiences[0].name == "Feast")

        apply("experiences:close", ["id": "offline_e1"])
        #expect(state.experiences[0].closed == true)
        apply("experiences:reopen", ["id": "offline_e1"])
        #expect(state.experiences[0].closed == false)

        state.transactions = [Transaction(
            id: "t1", notebookId: "nb1", contactId: "c1",
            experienceId: "offline_e1", amount: 9
        )]
        apply("experiences:transfer", ["id": "offline_e1", "targetNotebookId": "nb2"])
        #expect(state.experiences[0].notebookId == "nb2")
        #expect(state.experiences[0].contactId == nil)
        #expect(state.transactions[0].notebookId == "nb2", "transactions must transfer with the experience")
        #expect(state.transactions[0].contactId == nil)

        apply("experiences:remove", ["id": "offline_e1"])
        #expect(state.experiences.isEmpty)
        #expect(state.transactions.isEmpty, "transactions of a removed experience must cascade")
    }

    @Test("transactions:create/update/remove apply with millisecond dates")
    func transactionLifecycle() {
        apply("transactions:create", [
            "notebookId": "nb1", "amount": 12.5, "description": "Taxi", "date": 1_700_000_000_000.0
        ], localId: "offline_t1")
        #expect(state.transactions.first?.id == "offline_t1")
        #expect(state.transactions.first?.amount == 12.5)
        #expect(state.transactions.first?.date == Date(timeIntervalSince1970: 1_700_000_000))

        apply("transactions:update", ["id": "offline_t1", "amount": -3.0, "description": nil, "date": 1_700_000_500_000.0])
        #expect(state.transactions[0].amount == -3.0)
        #expect(state.transactions[0].description == nil)
        #expect(state.transactions[0].date == Date(timeIntervalSince1970: 1_700_000_500))

        apply("transactions:remove", ["id": "offline_t1"])
        #expect(state.transactions.isEmpty)
    }

    @Test("Unknown paths and malformed args are inert")
    func unknownPathsAndMalformedArgs() {
        state.notebooks = [Notebook(id: "nb1", name: "Main")]
        apply("unknown:path", ["id": "nb1"])
        #expect(state.notebooks.count == 1)

        apply("notebooks:update", ["id": "nb1"])
        apply("notebooks:create", ["name": "NoLocalId"])
        apply("contacts:create", ["notebookId": "nb1"])
        #expect(state.notebooks.count == 1)
        #expect(state.contacts.isEmpty)
    }

    @Test("validateOfflineMutation blocks writes into closed experiences")
    func validateClosedExperienceRule() {
        state.experiences = [Experience(id: "e_open", notebookId: "nb1", name: "Open"),
                             Experience(id: "e_closed", notebookId: "nb1", name: "Done", closed: true)]
        state.transactions = [Transaction(id: "t_in_closed", notebookId: "nb1", experienceId: "e_closed", amount: 5),
                              Transaction(id: "t_in_open", notebookId: "nb1", experienceId: "e_open", amount: 5)]

        #expect(throws: Never.self) {
            try state.validateOfflineMutation("contacts:create", args: [:])
        }
        #expect(throws: Never.self) {
            try state.validateOfflineMutation(
                "transactions:create",
                args: ["notebookId": "nb1", "experienceId": "e_open", "amount": 1]
            )
        }
        #expect(throws: Never.self) {
            try state.validateOfflineMutation("transactions:update", args: ["id": "t_in_open", "amount": 2])
        }

        #expect {
            try state.validateOfflineMutation(
                "transactions:create",
                args: ["notebookId": "nb1", "experienceId": "e_closed", "amount": 1]
            )
        } throws: { error in
            error.localizedDescription.contains("closed experience")
        }
        #expect {
            try state.validateOfflineMutation("transactions:update", args: ["id": "t_in_closed", "amount": 2])
        } throws: { error in
            error.localizedDescription.contains("closed experience")
        }
        #expect {
            try state.validateOfflineMutation("transactions:remove", args: ["id": "t_in_closed"])
        } throws: { error in
            error.localizedDescription.contains("closed experience")
        }
    }
}
