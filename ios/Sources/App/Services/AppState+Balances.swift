import Foundation

// MARK: - Balance Facade
// Thin delegates to the pure `BalanceEngine`, keeping the historical
// `AppState` API intact for views and tests.
extension AppState {
    /// The engine rebuilt from current state on each access — balances are
    /// cheap reductions and the data sets are small.
    var balances: BalanceEngine {
        BalanceEngine(
            contacts: contacts,
            experiences: experiences,
            transactions: transactions
        )
    }

    public func directTransactions(for contactId: String) -> [Transaction] {
        balances.directTransactions(for: contactId)
    }

    public func lastTransactionDate(for contactId: String) -> Date? {
        balances.lastTransactionDate(for: contactId)
    }

    public func closedExperiences(for contactId: String) -> [Experience] {
        balances.closedExperiences(for: contactId)
    }

    public func contactBalance(_ contactId: String) -> Double {
        balances.contactBalance(contactId)
    }

    public func experienceBalance(_ experienceId: String) -> Double {
        balances.experienceBalance(experienceId)
    }

    public func experienceTransactions(_ experienceId: String) -> [Transaction] {
        balances.experienceTransactions(experienceId)
    }

    public func notebookBalance(_ notebookId: String) -> Double {
        balances.notebookBalance(notebookId)
    }

    public func moneyOwed(for notebookId: String) -> Double {
        balances.moneyOwed(for: notebookId)
    }

    public func moneyGiven(for notebookId: String) -> Double {
        balances.moneyGiven(for: notebookId)
    }

    public func netBalance(for notebookId: String) -> Double {
        balances.netBalance(for: notebookId)
    }

    public func totalExperiencesBalance(for notebookId: String) -> Double {
        balances.totalExperiencesBalance(for: notebookId)
    }
}
