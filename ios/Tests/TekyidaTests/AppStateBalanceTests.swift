import Testing
@testable import Tekyida

@Suite("AppState Balances")
@MainActor
struct AppStateBalanceTests {
    private let backend = MockBackend()
    private let state: AppState
    private let notebook: Notebook

    init() {
        state = TestSupport.makeState(backend: backend)
        notebook = Notebook(name: "Test Notebook")
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
    }

    @Test("Balance calculations and aggregations")
    func balanceCalculationsAndAggregations() {
        let aliceId = state.contacts[0].id

        #expect(state.contactBalance(aliceId) == 150)
        #expect(state.experienceBalance(state.experiences[0].id) == 50)
        #expect(state.moneyOwed(for: notebook.id) == 150)
        #expect(state.moneyGiven(for: notebook.id) == 40)
        #expect(state.netBalance(for: notebook.id) == 110)
    }

    @Test("BalanceEngine pure math matches the AppState facade")
    func balanceEnginePureMathMatchesFacade() {
        let engine = BalanceEngine(
            contacts: state.contacts,
            experiences: state.experiences,
            transactions: state.transactions
        )
        let aliceId = state.contacts[0].id

        #expect(engine.contactBalance(aliceId) == state.contactBalance(aliceId))
        #expect(engine.notebookBalance(notebook.id) == state.notebookBalance(notebook.id))
        #expect(engine.moneyOwed(for: notebook.id) == state.moneyOwed(for: notebook.id))
        #expect(engine.moneyGiven(for: notebook.id) == state.moneyGiven(for: notebook.id))
        #expect(engine.netBalance(for: notebook.id) == state.netBalance(for: notebook.id))
        #expect(engine.totalExperiencesBalance(for: notebook.id) == 999,
                "total experiences balance counts open experiences only (closed experience's 50 is excluded)")
    }
}
