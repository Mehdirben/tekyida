import XCTest
@testable import Tekyida

@MainActor
final class AppStateBalanceTests: XCTestCase {
    private func makePopulatedState() -> (AppState, Notebook) {
        let state = AppState()
        let notebook = Notebook(name: "Test Notebook")
        let alice = Contact(notebookId: notebook.id, name: "Alice", phone: "123")
        let bob = Contact(notebookId: notebook.id, name: "Bob", phone: "456")
        let closedExperience = Experience(notebookId: notebook.id, contactId: alice.id, name: "Closed", closed: true)
        let openExperience = Experience(notebookId: notebook.id, contactId: alice.id, name: "Open")
        state.notebooks = [notebook]
        state.contacts = [alice, bob]
        state.experiences = [closedExperience, openExperience]
        state.transactions = [
            Transaction(notebookId: notebook.id, contactId: alice.id, amount: 100),
            Transaction(notebookId: notebook.id, contactId: bob.id, amount: -40),
            Transaction(notebookId: notebook.id, experienceId: closedExperience.id, amount: 50),
            Transaction(notebookId: notebook.id, experienceId: openExperience.id, amount: 999)
        ]
        return (state, notebook)
    }

    func testBalanceCalculationsAndAggregations() {
        let (state, notebook) = makePopulatedState()
        let aliceId = state.contacts[0].id

        XCTAssertEqual(state.contactBalance(aliceId), 150)
        XCTAssertEqual(state.experienceBalance(state.experiences[0].id), 50)
        XCTAssertEqual(state.moneyOwed(for: notebook.id), 150)
        XCTAssertEqual(state.moneyGiven(for: notebook.id), 40)
        XCTAssertEqual(state.netBalance(for: notebook.id), 110)
    }

    func testBalanceEnginePureMathMatchesFacade() {
        let (state, notebook) = makePopulatedState()
        let engine = BalanceEngine(
            contacts: state.contacts,
            experiences: state.experiences,
            transactions: state.transactions
        )
        let aliceId = state.contacts[0].id

        XCTAssertEqual(engine.contactBalance(aliceId), state.contactBalance(aliceId))
        XCTAssertEqual(engine.notebookBalance(notebook.id), state.notebookBalance(notebook.id))
        XCTAssertEqual(engine.moneyOwed(for: notebook.id), state.moneyOwed(for: notebook.id))
        XCTAssertEqual(engine.moneyGiven(for: notebook.id), state.moneyGiven(for: notebook.id))
        XCTAssertEqual(engine.netBalance(for: notebook.id), state.netBalance(for: notebook.id))
        XCTAssertEqual(engine.totalExperiencesBalance(for: notebook.id), 50)
    }
}
