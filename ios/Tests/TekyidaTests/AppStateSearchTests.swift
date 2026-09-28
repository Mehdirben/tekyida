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
        let experience = Experience(notebookId: notebook.id, contactId: contact.id, name: "Sahara Desert Trek")
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

    @Test("Search without a notebook scans across all notebooks")
    func searchWithoutNotebookScope() {
        let results = SearchEngine.run(
            contacts: [Contact(notebookId: "nb1", name: "Amir"), Contact(notebookId: "nb2", name: "Lina")],
            experiences: [Experience(notebookId: "nb2", name: "Anniversary")],
            transactions: [Transaction(notebookId: "nb1", amount: 5, description: "Apple")],
            notebookId: nil,
            query: "a"
        )
        #expect(results.totalCount == 4, "nil scope matches items from every notebook")
    }

    @Test("Transactions match by formatted amount")
    func searchMatchesAmount() {
        let results = SearchEngine.run(
            contacts: [],
            experiences: [],
            transactions: [Transaction(notebookId: "nb", amount: -12.5, description: nil)],
            notebookId: "nb",
            query: "12.50"
        )
        #expect(results.transactions.count == 1, "amount search uses the absolute two-decimal rendering")
    }

    @Test("Queries that match nothing return empty results")
    func searchNoMatch() {
        let results = SearchEngine.run(
            contacts: [Contact(notebookId: "nb", name: "Amir", phone: "123")],
            experiences: [Experience(notebookId: "nb", name: "Trip")],
            transactions: [Transaction(notebookId: "nb", amount: 5, description: "Apple")],
            notebookId: "nb",
            query: "zzz"
        )
        #expect(results.isEmpty)
        #expect(results.totalCount == 0)
    }
}
