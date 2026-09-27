import Foundation

/// Pure search over the app's data arrays, scoped to the active notebook.
///
/// Stateless on purpose: it can be unit-tested directly without `AppState`,
/// and `AppState.search(query:)` is a thin facade over `SearchEngine.run`.
public enum SearchEngine {
    public struct Results: Sendable {
        public let contacts: [Contact]
        public let experiences: [Experience]
        public let transactions: [Transaction]

        public init(contacts: [Contact] = [], experiences: [Experience] = [], transactions: [Transaction] = []) {
            self.contacts = contacts
            self.experiences = experiences
            self.transactions = transactions
        }

        public var isEmpty: Bool { contacts.isEmpty && experiences.isEmpty && transactions.isEmpty }
        public var totalCount: Int { contacts.count + experiences.count + transactions.count }
    }

    public static func run(
        contacts: [Contact],
        experiences: [Experience],
        transactions: [Transaction],
        notebookId: String?,
        query rawQuery: String
    ) -> Results {
        let query = rawQuery.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !query.isEmpty else { return Results() }
        let foundContacts = contacts.filter {
            ($0.notebookId == notebookId || notebookId == nil) &&
            ($0.name.lowercased().contains(query) || ($0.phone?.lowercased().contains(query) ?? false))
        }
        let foundExperiences = experiences.filter {
            ($0.notebookId == notebookId || notebookId == nil) && $0.name.lowercased().contains(query)
        }
        let foundTransactions = transactions.filter {
            ($0.notebookId == notebookId || notebookId == nil) &&
            (($0.description?.lowercased().contains(query) ?? false) || String(format: "%.2f", abs($0.amount)).contains(query))
        }
        return Results(contacts: foundContacts, experiences: foundExperiences, transactions: foundTransactions)
    }
}
