import Foundation

// MARK: - Notebook Model
public struct Notebook: Identifiable, Codable, Equatable, Hashable, Sendable {
    public let id: String
    public var name: String
    public var order: Int?
    public var archived: Bool
    public let createdAt: Date

    public init(
        id: String = UUID().uuidString,
        name: String,
        order: Int? = nil,
        archived: Bool = false,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.order = order
        self.archived = archived
        self.createdAt = createdAt
    }
}

// MARK: - Contact Model
public struct Contact: Identifiable, Codable, Equatable, Hashable, Sendable {
    public let id: String
    public var notebookId: String
    public var name: String
    public var phone: String?
    public let createdAt: Date

    public init(
        id: String = UUID().uuidString,
        notebookId: String,
        name: String,
        phone: String? = nil,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.notebookId = notebookId
        self.name = name
        self.phone = phone
        self.createdAt = createdAt
    }
}

// MARK: - Experience Model
public struct Experience: Identifiable, Codable, Equatable, Hashable, Sendable {
    public let id: String
    public var notebookId: String
    public var contactId: String?
    public var name: String
    public var closed: Bool
    public let createdAt: Date

    public init(
        id: String = UUID().uuidString,
        notebookId: String,
        contactId: String? = nil,
        name: String,
        closed: Bool = false,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.notebookId = notebookId
        self.contactId = contactId
        self.name = name
        self.closed = closed
        self.createdAt = createdAt
    }
}

// MARK: - Transaction Model
public struct Transaction: Identifiable, Codable, Equatable, Hashable, Sendable {
    public let id: String
    public var notebookId: String
    public var contactId: String?
    public var experienceId: String?
    public var amount: Double
    public var description: String?
    public var date: Date
    public let createdAt: Date

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
