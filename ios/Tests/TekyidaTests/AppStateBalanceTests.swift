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

    @Test("BalanceEngine helper lookups")
    func balanceEngineHelpers() {
        let engine = BalanceEngine(
            contacts: state.contacts,
            experiences: state.experiences,
            transactions: state.transactions
        )
        let aliceId = state.contacts[0].id
        let closedId = state.experiences[0].id

        let direct = engine.directTransactions(for: aliceId)
        #expect(direct.count == 1, "Alice has one direct transaction (the experience-tied one is excluded)")
        #expect(direct.allSatisfy { $0.experienceId == nil })

        #expect(engine.lastTransactionDate(for: aliceId) != nil)
        #expect(engine.lastTransactionDate(for: "ghost") == nil)

        #expect(engine.closedExperiences(for: aliceId).map(\.id) == [closedId])
        #expect(engine.closedExperiences(for: "ghost").isEmpty)

        #expect(engine.experienceTransactions(closedId).count == 1)
        #expect(engine.experienceTransactions("ghost").isEmpty)
    }

    @Test("BalanceEngine sorts multi-element results newest-first")
    func balanceEngineSortsMultiElementResults() {
        let older = Date(timeIntervalSince1970: 1_000)
        let newer = Date(timeIntervalSince1970: 2_000)
        let alice = Contact(id: "c1", notebookId: "nb", name: "Alice", createdAt: older)
        let engine = BalanceEngine(
            contacts: [alice],
            experiences: [
                Experience(id: "old-exp", notebookId: "nb", contactId: "c1", name: "First", closed: true, createdAt: older),
                Experience(id: "new-exp", notebookId: "nb", contactId: "c1", name: "Second", closed: true, createdAt: newer)
            ],
            transactions: [
                Transaction(id: "d1", notebookId: "nb", contactId: "c1", amount: 1, date: older),
                Transaction(id: "d2", notebookId: "nb", contactId: "c1", amount: 2, date: newer),
                Transaction(id: "e1", notebookId: "nb", experienceId: "old-exp", amount: 3, date: older),
                Transaction(id: "e2", notebookId: "nb", experienceId: "old-exp", amount: 4, date: newer)
            ]
        )

        #expect(engine.directTransactions(for: "c1").map(\.id) == ["d2", "d1"], "direct newest first")
        #expect(engine.closedExperiences(for: "c1").map(\.id) == ["new-exp", "old-exp"], "closed experiences newest first")
        #expect(engine.experienceTransactions("old-exp").map(\.id) == ["e2", "e1"], "experience transactions newest first")
    }

    @Test("AppState balance facades expose the engine helpers")
    func balanceFacades() {
        let aliceId = state.contacts[0].id
        let closedId = state.experiences[0].id

        #expect(state.directTransactions(for: aliceId).count == 1)
        #expect(state.lastTransactionDate(for: aliceId) != nil)
        #expect(state.closedExperiences(for: aliceId).count == 1)
        #expect(state.experienceTransactions(closedId).count == 1)
        #expect(state.totalExperiencesBalance(for: notebook.id) == 999,
                "facade matches the engine: open experiences only")
    }
}
