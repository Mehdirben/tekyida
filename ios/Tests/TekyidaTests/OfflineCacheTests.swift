import Testing
import Foundation
@testable import Tekyida

@Suite("Offline Cache")
struct OfflineCacheTests {
    @Test("Snapshot round-trip and queued mutation persistence")
    func offlineCacheAndQueuedMutation() throws {
        let cache = TestSupport.makeTemporaryCache()

        let mutation = QueuedMutation(
            functionPath: "notebooks:create",
            arguments: try JSONSerialization.data(withJSONObject: ["name": "Trip"]),
            localCreatedId: "offline_123",
            accountEmail: "user@tekyida.app"
        )
        #expect(mutation.functionPath == "notebooks:create")
        #expect(mutation.localCreatedId == "offline_123")

        let snapshot = OfflineSnapshot(
            accountEmail: "user@tekyida.app",
            notebooks: [Notebook(name: "Offline Book")],
            contacts: [],
            experiences: [],
            transactions: [],
            pendingMutations: [mutation],
            localToServerIds: ["offline_123": "server_456"],
            activeNotebookId: "offline_123"
        )

        try cache.save(snapshot)
        let loaded = try #require(cache.load())
        #expect(loaded.accountEmail == "user@tekyida.app")
        #expect(loaded.notebooks.first?.name == "Offline Book")
        #expect(loaded.pendingMutations.count == 1)
        #expect(loaded.localToServerIds == ["offline_123": "server_456"])

        cache.clear()
        #expect(cache.load() == nil)
    }

    @Test("Loading a corrupt snapshot returns nil instead of crashing")
    func corruptedSnapshotReturnsNil() throws {
        let cache = TestSupport.makeTemporaryCache()
        let snapshot = OfflineSnapshot(
            accountEmail: "user@tekyida.app",
            notebooks: [],
            contacts: [],
            experiences: [],
            transactions: [],
            pendingMutations: [],
            localToServerIds: [:],
            activeNotebookId: nil
        )
        try cache.save(snapshot)

        let garbage = Data("not-json-at-all".utf8)
        try garbage.write(to: cache.fileURL)

        #expect(cache.load() == nil)
    }

    @Test("Loading with no file on disk returns nil")
    func missingFileReturnsNil() {
        let cache = TestSupport.makeTemporaryCache()
        #expect(cache.load() == nil)
    }
}
