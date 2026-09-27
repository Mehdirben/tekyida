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
        timeout: TimeInterval = 3
    ) async {
        let deadline = Date().addingTimeInterval(timeout)
        while !condition() && Date() < deadline {
            await Task.yield()
        }
        #expect(condition(), "wrapper effect not observed in time")
    }

    private func waitForMutation(_ path: String) async {
        await waitFor { backend.mutationCalls.contains { $0.path == path } }
    }

    // MARK: - Notebooks

    @Test("Notebook wrappers post their mutations")
    func notebookWrappers() async {
        await state.createNotebook(name: "Wrapped")
        await waitForMutation("notebooks:create")

        await state.updateNotebook(id: "nb1", name: "Renamed")
        await waitForMutation("notebooks:update")

        await state.archiveNotebook(id: "nb1", archived: true)
        await waitForMutation("notebooks:archive")

        await state.reorderNotebooks(orderedIds: ["b", "a"])
        await waitForMutation("notebooks:reorder")

        await state.deleteNotebook(id: "nb1")
        await waitForMutation("notebooks:remove")
    }

    // MARK: - Contacts

    @Test("Contact wrappers post their mutations")
    func contactWrappers() async {
        await state.createContact(notebookId: "nb1", name: "Alice")
        await waitForMutation("contacts:create")

        await state.updateContact(id: "c1", name: "Alicia", phone: "123")
        await waitForMutation("contacts:update")

        await state.deleteContact(id: "c1")
        await waitForMutation("contacts:remove")
    }

    @Test("Experience wrappers post their mutations")
    func experienceWrappers() async {
        state.experiences = [Experience(id: "e1", notebookId: "nb1", name: "Dinner")]

        await state.createExperience(notebookId: "nb1", name: "Trip", contactId: "c1")
        await waitForMutation("experiences:create")

        await state.updateExperience(id: "e1", name: "Feast")
        await waitForMutation("experiences:update")

        await state.toggleExperienceClosed(id: "e1")
        await waitForMutation("experiences:close")

        await state.transferExperience(id: "e1", to: "nb2")
        await waitForMutation("experiences:transfer")

        await state.deleteExperience(id: "e1")
        await waitForMutation("experiences:remove")
    }

    @Test("Transaction wrappers post their mutations")
    func transactionWrappers() async {
        let date = Date(timeIntervalSince1970: 1_700_000_000)

        await state.createTransaction(notebookId: "nb1", amount: 10, date: date)
        await waitForMutation("transactions:create")

        await state.updateTransaction(id: "t1", amount: -3, date: date)
        await waitForMutation("transactions:update")

        await state.deleteTransaction(id: "t1")
        await waitForMutation("transactions:remove")
    }

    // MARK: - Blank-input guards

    @Test("Blank inputs are rejected before any mutation is queued")
    func blankInputGuards() async {
        await state.createNotebook(name: "   ")
        await state.createContact(notebookId: "nb1", name: "  ")
        await state.updateContact(id: "c1", name: "")
        await state.createExperience(notebookId: "nb1", name: " ")

        for _ in 0..<10 { await Task.yield() }
        #expect(backend.mutationCalls.isEmpty)
    }

    // MARK: - Offline queueing via wrappers

    @Test("Wrappers queue offline instead of posting")
    func wrappersQueueOffline() async {
        state.isOnline = false

        await state.createContact(notebookId: "nb1", name: "Offline Alice")
        await waitFor({ state.pendingSyncCount == 1 })

        await state.deleteTransaction(id: "t9")
        await waitFor({ state.pendingSyncCount == 2 })

        #expect(backend.mutationCalls.isEmpty)
    }
}
