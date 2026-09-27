import Testing
@testable import Tekyida

@Suite("AppState Search")
@MainActor
struct AppStateSearchTests {
    private let backend = MockBackend()
    private let state: AppState

    init() {
        state = TestSupport.makeState(backend: backend)
    }

    @Test("Semantic search across contacts, experiences, and transactions")
    func semanticSearchEngine() {
        let notebook = Notebook(name: "Vacation")
        let contact = Contact(notebookId: notebook.id, name: "Youssef Alaoui", phone: "+212 600-001122")
        let secondContact = Contact(notebookId: notebook.id, name: "Leila Tazi", phone: "+212 611-334455")
        let experience = Experience(notebookId: notebook.id, name: "Sahara Desert Trek", contactId: contact.id)
        state.notebooks = [notebook]
        state.activeNotebookId = notebook.id
        state.contacts = [contact, secondContact]
        state.experiences = [experience]
        state.transactions = [
            Transaction(notebookId: notebook.id, contactId: contact.id, amount: 750, description: "Camel ride & tent"),
            Transaction(notebookId: notebook.id, experienceId: experience.id, amount: 1200, description: "Quad bikes")
        ]

        #expect(state.search(query: "Youssef").contacts.first?.name == "Youssef Alaoui")
        #expect(state.search(query: "3344").contacts.first?.name == "Leila Tazi")
        #expect(state.search(query: "Sahara").experiences.first?.name == "Sahara Desert Trek")
        #expect(state.search(query: "Camel").transactions.first?.description == "Camel ride & tent")
        #expect(state.search(query: "1200").transactions.count == 1)
        #expect(state.search(query: "   ").isEmpty)
    }

    @Test("SearchEngine blank queries and totals")
    func searchEngineBlankQueryAndTotals() {
        let blank = SearchEngine.run(
            contacts: [Contact(notebookId: "nb", name: "A")],
            experiences: [],
            transactions: [],
            notebookId: "nb",
            query: "   "
        )
        #expect(blank.isEmpty)
        #expect(blank.totalCount == 0)

        let results = SearchEngine.run(
            contacts: [Contact(notebookId: "nb", name: "Amir")],
            experiences: [Experience(notebookId: "nb", name: "Anniversary")],
            transactions: [Transaction(notebookId: "nb", amount: 5, description: "Apple")],
            notebookId: "nb",
            query: "a"
        )
        #expect(results.totalCount == 3)
        #expect(!results.isEmpty)
    }
}
