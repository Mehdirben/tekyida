import Foundation

struct QueuedMutation: Codable, Identifiable {
    let id: UUID
    let functionPath: String
    let arguments: Data
    let queuedAt: Date
    let localCreatedId: String?
    let accountEmail: String

    init(functionPath: String, arguments: Data, localCreatedId: String?, accountEmail: String) {
        self.id = UUID()
        self.functionPath = functionPath
        self.arguments = arguments
        self.queuedAt = Date()
        self.localCreatedId = localCreatedId
        self.accountEmail = accountEmail
    }
}

struct OfflineSnapshot: Codable {
    var accountEmail: String
    var notebooks: [Notebook]
    var contacts: [Contact]
    var experiences: [Experience]
    var transactions: [Transaction]
    var pendingMutations: [QueuedMutation]
    var localToServerIds: [String: String]
    var activeNotebookId: String?
}

final class OfflineCache {
    private let fileURL: URL

    init(fileManager: FileManager = .default) {
        let applicationSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let directory = applicationSupport.appendingPathComponent("Tekyida", isDirectory: true)
        fileURL = directory.appendingPathComponent("offline-cache.json")
    }

    func load() -> OfflineSnapshot? {
        guard let data = try? Data(contentsOf: fileURL) else { return nil }
        return try? JSONDecoder().decode(OfflineSnapshot.self, from: data)
    }

    func save(_ snapshot: OfflineSnapshot) throws {
        let directory = fileURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(
            at: directory,
            withIntermediateDirectories: true,
            attributes: [.protectionKey: FileProtectionType.complete]
        )
        let data = try JSONEncoder().encode(snapshot)
        try data.write(to: fileURL, options: [.atomic, .completeFileProtection])
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? fileURL.setResourceValues(values)
    }

    func clear() {
        try? FileManager.default.removeItem(at: fileURL)
    }
}
