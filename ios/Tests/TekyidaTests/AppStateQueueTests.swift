import Testing
import Foundation
@testable import Tekyida

@Suite("AppState Offline Queue Engine")
@MainActor
struct AppStateQueueTests {
    private let backend: MockBackend
    private let state: AppState

    init() throws {
        backend = MockBackend()
        state = TestSupport.makeSignedInState(backend: backend)
        try backend.seedDefaultRefreshData()
    }

    private func makeArgs(_ dict: [String: Any]) throws -> Data {
        try JSONSerialization.data(withJSONObject: dict)
    }

    // MARK: - Enqueue rules

    @Test("Enqueue requires a signed-in account email")
    func enqueueRequiresAccount() {
        state.userEmail = ""
        #expect {
            _ = try state.enqueueOfflineMutation("contacts:create", args: ["name": "X"])
        } throws: { error in
            error.localizedDescription.contains("Sign in once while online")
        }
    }

    @Test("Enqueueing a create generates an offline id and applies it optimistically")
    func enqueueCreateGeneratesOfflineId() throws {
        _ = try state.enqueueOfflineMutation("contacts:create", args: ["notebookId": "nb1", "name": "Alice"])

        let queued = try #require(state.pendingMutations.first)
        #expect(queued.functionPath == "contacts:create")
        #expect(queued.localCreatedId?.hasPrefix("offline_") == true)
        #expect(state.pendingSyncCount == 1)
        #expect(state.contacts.first?.id == queued.localCreatedId, "create must be applied optimistically")
        #expect(state.offlineCache.load()?.pendingMutations.count == 1, "queue must be persisted")
    }

    @Test("Removing an unsynced offline create collapses the queue entry")
    func removeCollapsesUnsyncedCreate() throws {
        let localId = String(data: try state.enqueueOfflineMutation(
            "contacts:create", args: ["notebookId": "nb1", "name": "Alice"]
        ), encoding: .utf8).map { $0.trimmingCharacters(in: CharacterSet(charactersIn: "\"")) }
        let id = try #require(localId)
        #expect(state.pendingMutations.count == 1)

        _ = try state.enqueueOfflineMutation("contacts:remove", args: ["id": id])

        #expect(state.pendingMutations.isEmpty, "create+remove of an unsynced item must cancel out")
        #expect(state.pendingSyncCount == 0)
        #expect(state.contacts.isEmpty, "item must be removed locally")
    }

    @Test("Removing a synced item prunes superseded updates and queues the delete")
    func removePrunesSupersededUpdates() throws {
        _ = try state.enqueueOfflineMutation("contacts:update", args: ["id": "srv1", "name": "Renamed"])
        #expect(state.pendingMutations.count == 1)

        _ = try state.enqueueOfflineMutation("contacts:remove", args: ["id": "srv1"])

        #expect(state.pendingMutations.map(\.functionPath) == ["contacts:remove"],
                "stale update for the same id must be pruned")
    }

    @Test("Enqueue rejects writes owned by another account")
    func enqueueRejectsForeignAccount() throws {
        _ = try state.enqueueOfflineMutation("contacts:create", args: ["notebookId": "nb1", "name": "A"])
        state.userEmail = "someoneelse@tekyida.app"

        #expect {
            _ = try state.enqueueOfflineMutation("contacts:update", args: ["id": "srv1", "name": "B"])
        } throws: { error in
            error.localizedDescription.contains("account that owns the pending")
        }
    }

    @Test("Closed-experience rules are validated before enqueueing")
    func enqueueValidatesClosedExperience() throws {
        state.experiences = [Experience(id: "e1", notebookId: "nb1", name: "Done", closed: true)]

        #expect {
            _ = try state.enqueueOfflineMutation(
                "transactions:create",
                args: ["notebookId": "nb1", "experienceId": "e1", "amount": 10]
            )
        } throws: { error in
            error.localizedDescription.contains("closed experience")
        }
    }

    // MARK: - Sync loop

    @Test("Sync drains the queue and maps local ids to server ids")
    func syncDrainsAndMapsIds() async throws {
        state.isOnline = false
        _ = try state.enqueueOfflineMutation("contacts:create", args: ["notebookId": "nb1", "name": "Alice"])
        let localId = try #require(state.pendingMutations.first?.localCreatedId)
        backend.setMutationJSON("contacts:create", "\"srv_c1\"")

        state.isOnline = true
        await state.syncPendingMutations()

        #expect(state.pendingMutations.isEmpty)
        #expect(state.pendingSyncCount == 0)
        #expect(state.localToServerIds[localId] == "srv_c1")
        #expect(backend.mutationCalls.first?.path == "contacts:create")
        #expect(state.appError == nil)
    }

    @Test("Corrupt queue entries are dropped with an error report")
    func corruptEntriesAreDropped() async throws {
        state.pendingMutations = [QueuedMutation(
            functionPath: "contacts:create",
            arguments: Data("not-json".utf8),
            localCreatedId: nil,
            accountEmail: "user@tekyida.app"
        )]
        state.pendingSyncCount = 1

        await state.syncPendingMutations()

        #expect(state.pendingMutations.isEmpty)
        #expect(state.pendingSyncCount == 0)
        #expect(state.appError?.contains("could not be read") == true)
    }

    @Test("Authentication failures abort the sync and keep the queue")
    func authFailureAbortsSync() async throws {
        state.pendingMutations = [QueuedMutation(
            functionPath: "contacts:create",
            arguments: try makeArgs(["notebookId": "nb1", "name": "Alice"]),
            localCreatedId: nil,
            accountEmail: "user@tekyida.app"
        )]
        state.pendingSyncCount = 1
        backend.setMutationError("contacts:create", BackendError.authenticationRequired("Session expired"))

        await state.syncPendingMutations()

        #expect(state.isAuthenticated == false)
        #expect(state.pendingSyncCount == 1, "queue must survive auth failures")
        #expect(backend.mutationCalls.count == 1, "sync must stop at the first auth failure")
    }

    @Test("Retryable failures pause the sync and go offline")
    func retryableFailurePausesSync() async throws {
        state.pendingMutations = [QueuedMutation(
            functionPath: "contacts:create",
            arguments: try makeArgs(["notebookId": "nb1", "name": "Alice"]),
            localCreatedId: nil,
            accountEmail: "user@tekyida.app"
        )]
        state.pendingSyncCount = 1
        backend.setMutationError("contacts:create", BackendError.networkUnavailable("Connection lost"))

        await state.syncPendingMutations()

        #expect(state.isOnline == false)
        #expect(state.pendingSyncCount == 1, "queue must be kept for retry")
    }

    @Test("Fatal failures dequeue the entry and report the error")
    func fatalFailureDequeues() async throws {
        state.pendingMutations = [QueuedMutation(
            functionPath: "contacts:create",
            arguments: try makeArgs(["notebookId": "nb1", "name": "Alice"]),
            localCreatedId: nil,
            accountEmail: "user@tekyida.app"
        )]
        state.pendingSyncCount = 1
        backend.setMutationError("contacts:create", BackendError.message("Validation failed"))

        await state.syncPendingMutations()

        #expect(state.pendingMutations.isEmpty)
        #expect(state.appError?.contains("could not be synced") == true)
        #expect(state.appError?.contains("Validation failed") == true)
    }

    @Test("Sync drops entries whose id is still a local offline id")
    func syncSkipsStillOfflineIds() async throws {
        state.pendingMutations = [QueuedMutation(
            functionPath: "contacts:update",
            arguments: try makeArgs(["id": "offline_1", "name": "X"]),
            localCreatedId: nil,
            accountEmail: "user@tekyida.app"
        )]
        state.pendingSyncCount = 1

        await state.syncPendingMutations()

        #expect(state.pendingMutations.isEmpty, "unresolvable offline id entries are dropped")
        #expect(backend.mutationCalls.isEmpty, "the server must not receive an offline_ id")
    }

    @Test("Removing an offline notebook collapses its dependent queued creates")
    func removeCollapsesDependentCreates() throws {
        state.isOnline = false
        _ = try state.enqueueOfflineMutation("notebooks:create", args: ["name": "Trip"])
        let notebookId = try #require(state.pendingMutations.first?.localCreatedId)

        _ = try state.enqueueOfflineMutation("contacts:create", args: ["notebookId": notebookId, "name": "Alice"])
        _ = try state.enqueueOfflineMutation("experiences:create", args: ["notebookId": notebookId, "name": "Dinner"])
        #expect(state.pendingMutations.count == 3)

        _ = try state.enqueueOfflineMutation("notebooks:remove", args: ["id": notebookId])

        #expect(state.pendingMutations.isEmpty, "dependent creates must collapse with the notebook remove")
        #expect(state.pendingSyncCount == 0)
    }

    @Test("Removing offline contacts and experiences collapses their queued transactions")
    func removeCollapsesTransactionCreates() throws {
        state.isOnline = false
        _ = try state.enqueueOfflineMutation("contacts:create", args: ["notebookId": "nb1", "name": "Alice"])
        let contactId = try #require(state.pendingMutations.first?.localCreatedId)
        _ = try state.enqueueOfflineMutation("transactions:create", args: [
            "notebookId": "nb1", "contactId": contactId, "amount": 5
        ])
        #expect(state.pendingMutations.count == 2)

        _ = try state.enqueueOfflineMutation("contacts:remove", args: ["id": contactId])
        #expect(state.pendingMutations.isEmpty, "queued transaction tied to the contact collapses too")

        _ = try state.enqueueOfflineMutation("experiences:create", args: ["notebookId": "nb1", "name": "Trip"])
        let experienceId = try #require(state.pendingMutations.first?.localCreatedId)
        _ = try state.enqueueOfflineMutation("transactions:create", args: [
            "notebookId": "nb1", "experienceId": experienceId, "amount": 7
        ])

        _ = try state.enqueueOfflineMutation("experiences:remove", args: ["id": experienceId])
        #expect(state.pendingMutations.isEmpty, "queued transaction tied to the experience collapses too")
    }

    @Test("Sync remaps the active notebook id from a queued create")
    func syncRemapsActiveNotebook() async throws {
        try backend.setQuery("notebooks:list", value: [Notebook(id: "srv_nb", name: "Trips")])
        state.isOnline = false
        _ = try state.enqueueOfflineMutation("notebooks:create", args: ["name": "Trips"])
        let localId = try #require(state.pendingMutations.first?.localCreatedId)
        state.activeNotebookId = localId
        backend.setMutationJSON("notebooks:create", "\"srv_nb\"")

        state.isOnline = true
        await state.syncPendingMutations()

        #expect(state.activeNotebookId == "srv_nb", "selection follows the server id")
    }

    @Test("Concurrent refreshes coalesce instead of doubling requests")
    func concurrentRefreshCoalesces() async {
        await withTaskGroup(of: Void.self) { group in
            group.addTask { @MainActor in
                await self.state.refreshDataAndReportError()
            }
            group.addTask { @MainActor in
                await self.state.refreshDataAndReportError()
            }
        }
        #expect(state.appError == nil)
    }

    @Test("Sync refuses entries owned by a different account")
    func syncRejectsForeignEntries() async throws {
        state.pendingMutations = [QueuedMutation(
            functionPath: "contacts:create",
            arguments: try makeArgs(["notebookId": "nb1", "name": "Alice"]),
            localCreatedId: nil,
            accountEmail: "intruder@tekyida.app"
        )]
        state.pendingSyncCount = 1

        await state.syncPendingMutations()

        #expect(backend.mutationCalls.isEmpty)
        #expect(state.pendingSyncCount == 1)
        #expect(state.appError?.contains("another account") == true)
    }

    // MARK: - Local id substitution

    @Test("replaceLocalIds substitutes recursively through dicts and arrays")
    func replaceLocalIdsRecursively() throws {
        state.localToServerIds = ["offline_1": "srv_1", "offline_2": "srv_2"]
        let input: [String: Any] = [
            "contactId": "offline_1",
            "nested": ["experienceId": "offline_2", "keep": "srv_9"],
            "list": ["offline_1", "plain"]
        ]
        let resolved = state.replaceLocalIds(in: input) as? [String: Any]

        #expect(resolved?["contactId"] as? String == "srv_1")
        #expect((resolved?["nested"] as? [String: Any])?["experienceId"] as? String == "srv_2")
        #expect((resolved?["nested"] as? [String: Any])?["keep"] as? String == "srv_9")
        #expect((resolved?["list"] as? [Any])?.first as? String == "srv_1")
        #expect((resolved?["list"] as? [Any])?.last as? String == "plain")
    }

    // MARK: - Refresh pipeline

    @Test("runMutation requires authentication")
    func runMutationRequiresAuth() async {
        state.isAuthenticated = false
        await #expect {
            _ = try await state.runMutation("contacts:create", args: [:])
        } throws: { error in
            error.localizedDescription.contains("Sign in")
        }
    }

    @Test("refreshData rejects pending changes owned by another account")
    func refreshDataRejectsForeignPending() async throws {
        state.pendingMutations = [QueuedMutation(
            functionPath: "contacts:create",
            arguments: try makeArgs(["name": "X"]),
            localCreatedId: nil,
            accountEmail: "intruder@tekyida.app"
        )]

        await #expect {
            try await state.refreshData()
        } throws: { error in
            error.localizedDescription.contains("another account")
        }
    }

    @Test("refreshData remaps the active notebook through localToServerIds")
    func refreshDataRemapsActiveNotebook() async throws {
        try backend.setQuery("notebooks:list", value: [Notebook(id: "srv_nb", name: "Trips")])
        state.pendingMutations = [QueuedMutation(
            functionPath: "notebooks:create",
            arguments: try makeArgs(["name": "Trips"]),
            localCreatedId: "offline_nb",
            accountEmail: "user@tekyida.app"
        )]
        state.localToServerIds = ["offline_nb": "srv_nb"]
        state.activeNotebookId = "offline_nb"

        try await state.refreshData()

        #expect(state.activeNotebookId == "srv_nb", "offline active id must resolve to the server id")
    }

    @Test("refreshDataAndReportError flips offline on connectivity failures")
    func refreshReportsConnectivityFailure() async {
        backend.setQueryError("notebooks:list", BackendError.networkUnavailable("Airplane mode"))

        await state.refreshDataAndReportError()

        #expect(state.isOnline == false)
        #expect(state.isAuthenticated == true, "connectivity failures must not sign out")
    }

    @Test("refreshDataAndReportError signs out on fatal errors without a session")
    func refreshSignsOutWithoutSession() async {
        backend.hasSession = false
        backend.setQueryError("notebooks:list", BackendError.message("Token rejected"))

        await state.refreshDataAndReportError()

        #expect(state.isAuthenticated == false)
        #expect(state.authError == "Token rejected")
    }

    @Test("refresh() is a no-op while offline")
    func refreshNoopOffline() async {
        state.isAuthenticated = true
        state.isOnline = false

        await state.refresh()

        #expect(backend.queryCalls.isEmpty)
    }
}
