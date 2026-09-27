import Testing
import Foundation
@testable import Tekyida

/// The synchronous view callbacks wrap their async counterparts in
/// fire-and-forget `Task`s. These tests invoke the wrappers and wait for the
/// resulting backend activity, keeping the wrapper layer itself covered.
@Suite("AppState Sync Wrappers")
@MainActor
struct AppStateActionWrappersTests {
    private let backend: MockBackend
    private let state: AppState

    init() throws {
        backend = MockBackend()
        state = TestSupport.makeSignedInState(backend: backend)
        try backend.seedDefaultRefreshData()
    }

    /// Yields the main actor until the fire-and-forget task settles.
    private func waitFor(
        _ condition: @MainActor () -> Bool,
        _ what: String,
        timeout: TimeInterval = 3
    ) async {
        let deadline = Date().addingTimeInterval(timeout)
        while !condition() && Date() < deadline {
            await Task.yield()
        }
        #expect(condition(), "\(what) not observed in time. Mutations seen: \(backend.mutationCalls.map(\.path))")
    }

    private func waitForMutation(_ path: String) async {
        await waitFor({ backend.mutationCalls.contains { $0.path == path } }, path)
    }

    // MARK: - Notebooks

    @Test("Notebook wrappers post their mutations")
    func notebookWrappers() async {
        state.createNotebook(name: "Wrapped")
        await waitForMutation("notebooks:create")

        state.updateNotebook(id: "nb1", name: "Renamed")
        await waitForMutation("notebooks:update")

        state.archiveNotebook(id: "nb1", archived: true)
        await waitForMutation("notebooks:archive")

        state.reorderNotebooks(orderedIds: ["b", "a"])
        await waitForMutation("notebooks:reorder")

        state.deleteNotebook(id: "nb1")
        await waitForMutation("notebooks:remove")
    }

    // MARK: - Contacts

    @Test("Contact wrappers post their mutations")
    func contactWrappers() async {
        state.createContact(notebookId: "nb1", name: "Alice")
        await waitForMutation("contacts:create")

        state.updateContact(id: "c1", name: "Alicia", phone: "123")
        await waitForMutation("contacts:update")

        state.deleteContact(id: "c1")
        await waitForMutation("contacts:remove")
    }

    @Test("Experience wrappers post their mutations")
    func experienceWrappers() async throws {
        // Seed the server list so the post-mutation refresh keeps the local
        // experience (toggle's guard looks it up after the refresh).
        try backend.setQuery("experiences:list", value: [
            Experience(id: "e1", notebookId: "nb1", name: "Dinner")
        ])
        state.experiences = [Experience(id: "e1", notebookId: "nb1", name: "Dinner")]

        state.createExperience(notebookId: "nb1", name: "Trip", contactId: "c1")
        await waitForMutation("experiences:create")

        state.updateExperience(id: "e1", name: "Feast")
        await waitForMutation("experiences:update")

        state.toggleExperienceClosed(id: "e1")
        await waitForMutation("experiences:close")

        state.transferExperience(id: "e1", to: "nb2")
        await waitForMutation("experiences:transfer")

        state.deleteExperience(id: "e1")
        await waitForMutation("experiences:remove")
    }

    @Test("Transaction wrappers post their mutations")
    func transactionWrappers() async {
        let date = Date(timeIntervalSince1970: 1_700_000_000)

        state.createTransaction(notebookId: "nb1", amount: 10, date: date)
        await waitForMutation("transactions:create")

        state.updateTransaction(id: "t1", amount: -3, date: date)
        await waitForMutation("transactions:update")

        state.deleteTransaction(id: "t1")
        await waitForMutation("transactions:remove")
    }

    // MARK: - Blank-input guards

    @Test("Blank inputs are rejected before any mutation is queued")
    func blankInputGuards() async {
        state.createNotebook(name: "   ")
        state.createContact(notebookId: "nb1", name: "  ")
        state.updateContact(id: "c1", name: "")
        state.createExperience(notebookId: "nb1", name: " ")

        for _ in 0..<10 { await Task.yield() }
        #expect(backend.mutationCalls.isEmpty)
    }

    // MARK: - Offline queueing via wrappers

    @Test("Wrappers queue offline instead of posting")
    func wrappersQueueOffline() async {
        state.isOnline = false

        state.createContact(notebookId: "nb1", name: "Offline Alice")
        await waitFor({ state.pendingSyncCount == 1 })

        state.deleteTransaction(id: "t9")
        await waitFor({ state.pendingSyncCount == 2 })

        #expect(backend.mutationCalls.isEmpty)
    }
}
