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

    /// Invokes wrappers from a synchronous closure: in async contexts the
    /// compiler always prefers the `async` overloads, which would bypass the
    /// fire-and-forget wrappers this suite exists to cover.
    private func fire(_ work: @MainActor () -> Void) {
        work()
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
        #expect(condition(), "\(what) not observed in time. Mutations seen: \(backend.mutationCalls.map(\.path)). Experiences: \(state.experiences.map(\.id))")
    }

    private func waitForMutation(_ path: String) async {
        await waitFor({ backend.mutationCalls.contains { $0.path == path } }, path)
    }

    // MARK: - Notebooks

    @Test("Notebook wrappers post their mutations")
    func notebookWrappers() async {
        fire { state.createNotebook(name: "Wrapped") }
        await waitForMutation("notebooks:create")

        fire { state.updateNotebook(id: "nb1", name: "Renamed") }
        await waitForMutation("notebooks:update")

        fire { state.archiveNotebook(id: "nb1", archived: true) }
        await waitForMutation("notebooks:archive")

        fire { state.reorderNotebooks(orderedIds: ["b", "a"]) }
        await waitForMutation("notebooks:reorder")

        fire { state.deleteNotebook(id: "nb1") }
        await waitForMutation("notebooks:remove")
    }

    // MARK: - Contacts

    @Test("Contact wrappers post their mutations")
    func contactWrappers() async {
        fire { state.createContact(notebookId: "nb1", name: "Alice") }
        await waitForMutation("contacts:create")

        fire { state.updateContact(id: "c1", name: "Alicia", phone: "123") }
        await waitForMutation("contacts:update")

        fire { state.deleteContact(id: "c1") }
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

        // Toggle runs FIRST: its guard reads local state, so it must happen
        // before any refresh can replace the array mid-flight.
        fire { state.toggleExperienceClosed(id: "e1") }
        await waitForMutation("experiences:close")

        fire { state.createExperience(notebookId: "nb1", name: "Trip", contactId: "c1") }
        await waitForMutation("experiences:create")

        fire { state.updateExperience(id: "e1", name: "Feast") }
        await waitForMutation("experiences:update")

        fire { state.transferExperience(id: "e1", to: "nb2") }
        await waitForMutation("experiences:transfer")

        fire { state.deleteExperience(id: "e1") }
        await waitForMutation("experiences:remove")
    }

    @Test("toggleExperienceClosed wrapper reopens a closed experience")
    func toggleReopenWrapper() async {
        state.experiences = [Experience(id: "e2", notebookId: "nb1", name: "Done", closed: true)]

        fire { state.toggleExperienceClosed(id: "e2") }

        await waitForMutation("experiences:reopen")
    }

    @Test("Transaction wrappers post their mutations")
    func transactionWrappers() async {
        let date = Date(timeIntervalSince1970: 1_700_000_000)

        fire { state.createTransaction(notebookId: "nb1", amount: 10, date: date) }
        await waitForMutation("transactions:create")

        fire { state.updateTransaction(id: "t1", amount: -3, date: date) }
        await waitForMutation("transactions:update")

        fire { state.deleteTransaction(id: "t1") }
        await waitForMutation("transactions:remove")
    }

    // MARK: - Blank-input guards

    @Test("Blank inputs are rejected before any mutation is queued")
    func blankInputGuards() async {
        fire { state.createNotebook(name: "   ") }
        fire { state.createContact(notebookId: "nb1", name: "  ") }
        fire { state.updateContact(id: "c1", name: "") }
        fire { state.createExperience(notebookId: "nb1", name: " ") }

        for _ in 0..<10 { await Task.yield() }
        #expect(backend.mutationCalls.isEmpty)
    }

    // MARK: - Offline queueing via wrappers

    @Test("Wrappers queue offline instead of posting")
    func wrappersQueueOffline() async {
        state.isOnline = false

        fire { state.createContact(notebookId: "nb1", name: "Offline Alice") }
        await waitFor({ state.pendingSyncCount == 1 }, "first offline enqueue")

        fire { state.deleteTransaction(id: "t9") }
        await waitFor({ state.pendingSyncCount == 2 }, "second offline enqueue")

        #expect(backend.mutationCalls.isEmpty)
    }
}
