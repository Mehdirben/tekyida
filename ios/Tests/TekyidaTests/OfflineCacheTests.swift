import XCTest
@testable import Tekyida

final class OfflineCacheTests: XCTestCase {
    func testOfflineCacheAndQueuedMutation() throws {
        let tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tempDir) }

        let mutation = QueuedMutation(
            functionPath: "notebooks:create",
            arguments: try JSONSerialization.data(withJSONObject: ["name": "Trip"]),
            localCreatedId: "offline_123",
            accountEmail: "user@tekyida.app"
        )
        XCTAssertEqual(mutation.functionPath, "notebooks:create")
        XCTAssertEqual(mutation.localCreatedId, "offline_123")

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

        let cache = OfflineCache()
        try cache.save(snapshot)
        let loaded = cache.load()
        XCTAssertNotNil(loaded)
        XCTAssertEqual(loaded?.accountEmail, "user@tekyida.app")
        XCTAssertEqual(loaded?.notebooks.first?.name, "Offline Book")
        XCTAssertEqual(loaded?.pendingMutations.count, 1)

        cache.clear()
        XCTAssertNil(cache.load())
    }
}
