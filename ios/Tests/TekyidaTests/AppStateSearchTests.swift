import XCTest
@testable import Tekyida

@MainActor
final class AppStateSearchTests: XCTestCase {
    func testSemanticSearchEngine() {
        let state = AppState()
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

        XCTAssertEqual(state.search(query: "Youssef").contacts.first?.name, "Youssef Alaoui")
        XCTAssertEqual(state.search(query: "3344").contacts.first?.name, "Leila Tazi")
        XCTAssertEqual(state.search(query: "Sahara").experiences.first?.name, "Sahara Desert Trek")
        XCTAssertEqual(state.search(query: "Camel").transactions.first?.description, "Camel ride & tent")
        XCTAssertEqual(state.search(query: "1200").transactions.count, 1)
        XCTAssertTrue(state.search(query: "   ").isEmpty)
    }

    func testSearchEngineBlankQueryAndTotals() {
        let blank = SearchEngine.run(
            contacts: [Contact(notebookId: "nb", name: "A")],
            experiences: [],
            transactions: [],
            notebookId: "nb",
            query: "   "
        )
        XCTAssertTrue(blank.isEmpty)
        XCTAssertEqual(blank.totalCount, 0)

        let results = SearchEngine.run(
            contacts: [Contact(notebookId: "nb", name: "Amir")],
            experiences: [Experience(notebookId: "nb", name: "Anniversary")],
            transactions: [Transaction(notebookId: "nb", amount: 5, description: "Apple")],
            notebookId: "nb",
            query: "a"
        )
        XCTAssertEqual(results.totalCount, 3)
        XCTAssertFalse(results.isEmpty)
    }
}
