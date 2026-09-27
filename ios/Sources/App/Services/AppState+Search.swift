import Foundation

// MARK: - Search Facade
// Delegates to the pure `SearchEngine`. The `SearchResults` typealias keeps
// the historical `AppState.SearchResults` spelling valid everywhere.
public extension AppState {
    typealias SearchResults = SearchEngine.Results

    func search(query: String) -> SearchResults {
        SearchEngine.run(
            contacts: contacts,
            experiences: experiences,
            transactions: transactions,
            notebookId: activeNotebook?.id,
            query: query
        )
    }
}
