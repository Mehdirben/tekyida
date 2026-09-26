import Foundation

// MARK: - Convex-backed Models
public struct Notebook: Identifiable, Codable, Equatable, Hashable, Sendable {
    public let id: String
    public var name: String
    public var order: Int?
    public var archived: Bool
    public let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, order, archived, createdAt
    }

    public init(id: String = UUID().uuidString, name: String, order: Int? = nil, archived: Bool = false, createdAt: Date = Date()) {
        self.id = id
        self.name = name
        self.order = order
        self.archived = archived
        self.createdAt = createdAt
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        name = try c.decode(String.self, forKey: .name)
        order = try c.decodeIfPresent(Int.self, forKey: .order)
        archived = try c.decodeIfPresent(Bool.self, forKey: .archived) ?? false
        createdAt = Date(timeIntervalSince1970: (try c.decode(Double.self, forKey: .createdAt)) / 1000)
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(name, forKey: .name)
        try c.encodeIfPresent(order, forKey: .order)
        try c.encode(archived, forKey: .archived)
        try c.encode(createdAt.timeIntervalSince1970 * 1000, forKey: .createdAt)
    }
}

public struct Contact: Identifiable, Codable, Equatable, Hashable, Sendable {
    public let id: String
    public var notebookId: String
    public var name: String
    public var phone: String?
    public let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case notebookId, name, phone, createdAt
    }

    public init(id: String = UUID().uuidString, notebookId: String, name: String, phone: String? = nil, createdAt: Date = Date()) {
        self.id = id
        self.notebookId = notebookId
        self.name = name
        self.phone = phone
        self.createdAt = createdAt
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        notebookId = try c.decode(String.self, forKey: .notebookId)
        name = try c.decode(String.self, forKey: .name)
        phone = try c.decodeIfPresent(String.self, forKey: .phone)
        createdAt = Date(timeIntervalSince1970: (try c.decode(Double.self, forKey: .createdAt)) / 1000)
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(notebookId, forKey: .notebookId)
        try c.encode(name, forKey: .name)
        try c.encodeIfPresent(phone, forKey: .phone)
        try c.encode(createdAt.timeIntervalSince1970 * 1000, forKey: .createdAt)
    }
}

public struct Experience: Identifiable, Codable, Equatable, Hashable, Sendable {
    public let id: String
    public var notebookId: String
    public var contactId: String?
    public var name: String
    public var closed: Bool
    public let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case notebookId, contactId, name, closed, createdAt
    }

    public init(id: String = UUID().uuidString, notebookId: String, contactId: String? = nil, name: String, closed: Bool = false, createdAt: Date = Date()) {
        self.id = id
        self.notebookId = notebookId
        self.contactId = contactId
        self.name = name
        self.closed = closed
        self.createdAt = createdAt
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        notebookId = try c.decode(String.self, forKey: .notebookId)
        contactId = try c.decodeIfPresent(String.self, forKey: .contactId)
        name = try c.decode(String.self, forKey: .name)
        closed = try c.decode(Bool.self, forKey: .closed)
        createdAt = Date(timeIntervalSince1970: (try c.decode(Double.self, forKey: .createdAt)) / 1000)
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(notebookId, forKey: .notebookId)
        try c.encodeIfPresent(contactId, forKey: .contactId)
        try c.encode(name, forKey: .name)
        try c.encode(closed, forKey: .closed)
        try c.encode(createdAt.timeIntervalSince1970 * 1000, forKey: .createdAt)
    }
}

public struct Transaction: Identifiable, Codable, Equatable, Hashable, Sendable {
    public let id: String
    public var notebookId: String
    public var contactId: String?
    public var experienceId: String?
    public var amount: Double
    public var description: String?
    public var date: Date
    public let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case notebookId, contactId, experienceId, amount, description, date, createdAt
    }

    public init(
        id: String = UUID().uuidString,
        notebookId: String,
        contactId: String? = nil,
        experienceId: String? = nil,
        amount: Double,
        description: String? = nil,
        date: Date = Date(),
        createdAt: Date = Date()
    ) {
        self.id = id
        self.notebookId = notebookId
        self.contactId = contactId
        self.experienceId = experienceId
        self.amount = amount
        self.description = description
        self.date = date
        self.createdAt = createdAt
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        notebookId = try c.decode(String.self, forKey: .notebookId)
        contactId = try c.decodeIfPresent(String.self, forKey: .contactId)
        experienceId = try c.decodeIfPresent(String.self, forKey: .experienceId)
        amount = try c.decode(Double.self, forKey: .amount)
        description = try c.decodeIfPresent(String.self, forKey: .description)
        let createdAtMs = try c.decode(Double.self, forKey: .createdAt)
        createdAt = Date(timeIntervalSince1970: createdAtMs / 1000)
        let dateMs = try c.decodeIfPresent(Double.self, forKey: .date) ?? createdAtMs
        date = Date(timeIntervalSince1970: dateMs / 1000)
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(notebookId, forKey: .notebookId)
        try c.encodeIfPresent(contactId, forKey: .contactId)
        try c.encodeIfPresent(experienceId, forKey: .experienceId)
        try c.encode(amount, forKey: .amount)
        try c.encodeIfPresent(description, forKey: .description)
        try c.encode(date.timeIntervalSince1970 * 1000, forKey: .date)
        try c.encode(createdAt.timeIntervalSince1970 * 1000, forKey: .createdAt)
    }
}

// MARK: - Settings Enums
public enum AppLanguage: String, Codable, CaseIterable, Sendable {
    case english = "en"
    case french = "fr"

    public var title: String {
        switch self {
        case .english: return "English"
        case .french: return "Français"
        }
    }
}

public enum AppThemeMode: String, Codable, CaseIterable, Sendable {
    case system = "system"
    case light = "light"
    case dark = "dark"

    public var title: String {
        switch self {
        case .system: return "System"
        case .light: return "Light"
        case .dark: return "Dark"
        }
    }
}
