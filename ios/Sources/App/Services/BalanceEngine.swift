import Foundation

/// Pure balance and aggregation math over the app's data arrays.
///
/// Stateless on purpose: it can be unit-tested directly without `AppState`,
/// and `AppState` exposes the same results as thin facade methods.
public struct BalanceEngine: Sendable {
    public let contacts: [Contact]
    public let experiences: [Experience]
    public let transactions: [Transaction]

    public init(
        contacts: [Contact] = [],
        experiences: [Experience] = [],
        transactions: [Transaction] = []
    ) {
        self.contacts = contacts
        self.experiences = experiences
        self.transactions = transactions
    }

    public func directTransactions(for contactId: String) -> [Transaction] {
        transactions.filter { $0.contactId == contactId && $0.experienceId == nil }.sorted { $0.date > $1.date }
    }

    public func lastTransactionDate(for contactId: String) -> Date? {
        transactions
            .filter { $0.contactId == contactId }
            .map(\.date)
            .max()
    }

    public func closedExperiences(for contactId: String) -> [Experience] {
        experiences.filter { $0.contactId == contactId && $0.closed }.sorted { $0.createdAt > $1.createdAt }
    }

    public func contactBalance(_ contactId: String) -> Double {
        let direct = directTransactions(for: contactId).reduce(0.0) { $0 + $1.amount }
        return direct + closedExperiences(for: contactId).reduce(0.0) { $0 + experienceBalance($1.id) }
    }

    public func experienceBalance(_ experienceId: String) -> Double {
        transactions.filter { $0.experienceId == experienceId }.reduce(0.0) { $0 + $1.amount }
    }

    public func experienceTransactions(_ experienceId: String) -> [Transaction] {
        transactions.filter { $0.experienceId == experienceId }.sorted { $0.date > $1.date }
    }

    public func notebookBalance(_ notebookId: String) -> Double {
        transactions.filter { $0.notebookId == notebookId }.reduce(0.0) { $0 + $1.amount }
    }

    public func moneyOwed(for notebookId: String) -> Double {
        contacts.filter { $0.notebookId == notebookId }.reduce(0.0) { total, contact in
            let balance = contactBalance(contact.id)
            return total + (balance > 0 ? balance : 0)
        }
    }

    public func moneyGiven(for notebookId: String) -> Double {
        contacts.filter { $0.notebookId == notebookId }.reduce(0.0) { total, contact in
            let balance = contactBalance(contact.id)
            return total + (balance < 0 ? abs(balance) : 0)
        }
    }

    public func netBalance(for notebookId: String) -> Double {
        moneyOwed(for: notebookId) - moneyGiven(for: notebookId)
    }

    public func totalExperiencesBalance(for notebookId: String) -> Double {
        experiences.filter { $0.notebookId == notebookId && !$0.closed }
            .reduce(0.0) { $0 + experienceBalance($1.id) }
    }
}
