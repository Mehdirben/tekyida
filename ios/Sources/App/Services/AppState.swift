import SwiftUI
import CryptoKit
import Combine

// MARK: - App State & Repository
public final class AppState: ObservableObject {
    // MARK: - Published State
    @Published public var notebooks: [Notebook] = []
    @Published public var activeNotebookId: String?
    @Published public var contacts: [Contact] = []
    @Published public var experiences: [Experience] = []
    @Published public var transactions: [Transaction] = []

    // Settings & Security
    @Published public var isAmountsHidden: Bool = false
    @Published public var isAppLocked: Bool = false
    @Published public var isLockConfigured: Bool = false
    @Published public var themeMode: AppThemeMode = .system
    @Published public var language: AppLanguage = .english
    @Published public var transferRedirect: Bool = true
    @Published public var amountsHiddenByDefault: Bool = false
    @Published public var userEmail: String = "user@tekyida.app"

    // Storage Keys
    private let notebooksKey = "tekyida_saved_notebooks"
    private let activeNotebookKey = "tekyida_active_notebook_id"
    private let contactsKey = "tekyida_saved_contacts"
    private let experiencesKey = "tekyida_saved_experiences"
    private let transactionsKey = "tekyida_saved_transactions"
    private let lockEnabledKey = "tekyida_lock_enabled"
    private let lockHashKey = "tekyida_lock_hash"
    private let lockSaltKey = "tekyida_lock_salt"
    private let themeKey = "tekyida_theme_mode"
    private let languageKey = "tekyida_language"
    private let amountsDefaultKey = "tekyida_amounts_hidden_default"
    private let transferRedirectKey = "tekyida_transfer_redirect"

    public init() {
        loadSettings()
        loadData()
    }

    // MARK: - Computed Properties
    public var activeNotebook: Notebook? {
        if let id = activeNotebookId, let found = notebooks.first(where: { $0.id == id && !$0.archived }) {
            return found
        }
        return notebooks.first(where: { !$0.archived })
    }

    public var activeNotebooksList: [Notebook] {
        notebooks
            .filter { !$0.archived }
            .sorted { ($0.order ?? 0) < ($1.order ?? 0) }
    }

    public var archivedNotebooksList: [Notebook] {
        notebooks.filter { $0.archived }
    }

    // MARK: - Balance Calculations
    public func directTransactions(for contactId: String) -> [Transaction] {
        transactions
            .filter { $0.contactId == contactId && $0.experienceId == nil }
            .sorted { $0.date > $1.date }
    }

    public func closedExperiences(for contactId: String) -> [Experience] {
        experiences
            .filter { $0.contactId == contactId && $0.closed }
            .sorted { $0.createdAt > $1.createdAt }
    }

    public func contactBalance(_ contactId: String) -> Double {
        let directSum = directTransactions(for: contactId).reduce(0.0) { $0 + $1.amount }
        let closedExpSum = closedExperiences(for: contactId).reduce(0.0) { sum, exp in
            sum + experienceBalance(exp.id)
        }
        return directSum + closedExpSum
    }

    public func experienceBalance(_ experienceId: String) -> Double {
        transactions
            .filter { $0.experienceId == experienceId }
            .reduce(0.0) { $0 + $1.amount }
    }

    public func experienceTransactions(_ experienceId: String) -> [Transaction] {
        transactions
            .filter { $0.experienceId == experienceId }
            .sorted { $0.date > $1.date }
    }

    public func notebookBalance(_ notebookId: String) -> Double {
        transactions
            .filter { $0.notebookId == notebookId }
            .reduce(0.0) { $0 + $1.amount }
    }

    // MARK: - Dashboard QuickStats
    public func moneyOwed(for notebookId: String) -> Double {
        let nbContacts = contacts.filter { $0.notebookId == notebookId }
        return nbContacts.reduce(0.0) { sum, c in
            let bal = contactBalance(c.id)
            return bal > 0 ? sum + bal : sum
        }
    }

    public func moneyGiven(for notebookId: String) -> Double {
        let nbContacts = contacts.filter { $0.notebookId == notebookId }
        return nbContacts.reduce(0.0) { sum, c in
            let bal = contactBalance(c.id)
            return bal < 0 ? sum + abs(bal) : sum
        }
    }

    public func netBalance(for notebookId: String) -> Double {
        moneyOwed(for: notebookId) - moneyGiven(for: notebookId)
    }

    public func totalExperiencesBalance(for notebookId: String) -> Double {
        let openExps = experiences.filter { $0.notebookId == notebookId && !$0.closed }
        return openExps.reduce(0.0) { $0 + experienceBalance($1.id) }
    }

    // MARK: - Notebook Actions
    public func createNotebook(name: String) {
        let trimmed = String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(20))
        guard !trimmed.isEmpty else { return }
        let nextOrder = (notebooks.map { $0.order ?? 0 }.max() ?? 0) + 1
        let nb = Notebook(name: trimmed, order: nextOrder)
        notebooks.append(nb)
        activeNotebookId = nb.id
        saveData()
    }

    public func updateNotebook(id: String, name: String) {
        let trimmed = String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(20))
        guard !trimmed.isEmpty, let idx = notebooks.firstIndex(where: { $0.id == id }) else { return }
        notebooks[idx].name = trimmed
        saveData()
    }

    public func archiveNotebook(id: String, archived: Bool) {
        guard let idx = notebooks.firstIndex(where: { $0.id == id }) else { return }
        notebooks[idx].archived = archived
        if activeNotebookId == id {
            activeNotebookId = activeNotebooksList.first?.id
        }
        saveData()
    }

    public func reorderNotebooks(orderedIds: [String]) {
        for (index, id) in orderedIds.enumerated() {
            if let idx = notebooks.firstIndex(where: { $0.id == id }) {
                notebooks[idx].order = index
            }
        }
        saveData()
    }

    public func deleteNotebook(id: String) {
        notebooks.removeAll { $0.id == id }
        contacts.removeAll { $0.notebookId == id }
        experiences.removeAll { $0.notebookId == id }
        transactions.removeAll { $0.notebookId == id }

        if activeNotebookId == id {
            activeNotebookId = activeNotebooksList.first?.id
        }
        if notebooks.isEmpty {
            createNotebook(name: "Personal")
        }
        saveData()
    }

    // MARK: - Contact Actions
    public func createContact(notebookId: String, name: String, phone: String? = nil) {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }
        let trimmedPhone = phone?.trimmingCharacters(in: .whitespacesAndNewlines)
        let contact = Contact(
            notebookId: notebookId,
            name: trimmedName,
            phone: trimmedPhone?.isEmpty == true ? nil : trimmedPhone
        )
        contacts.append(contact)
        saveData()
    }

    public func updateContact(id: String, name: String, phone: String? = nil) {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty, let idx = contacts.firstIndex(where: { $0.id == id }) else { return }
        let trimmedPhone = phone?.trimmingCharacters(in: .whitespacesAndNewlines)
        contacts[idx].name = trimmedName
        contacts[idx].phone = trimmedPhone?.isEmpty == true ? nil : trimmedPhone
        saveData()
    }

    public func deleteContact(id: String) {
        contacts.removeAll { $0.id == id }
        transactions.removeAll { $0.contactId == id && $0.experienceId == nil }
        for idx in experiences.indices where experiences[idx].contactId == id {
            experiences[idx].contactId = nil
        }
        saveData()
    }

    // MARK: - Experience Actions
    public func createExperience(notebookId: String, name: String, contactId: String? = nil) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let exp = Experience(
            notebookId: notebookId,
            contactId: contactId?.isEmpty == true ? nil : contactId,
            name: trimmed
        )
        experiences.append(exp)
        saveData()
    }

    public func updateExperience(id: String, name: String, contactId: String? = nil) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, let idx = experiences.firstIndex(where: { $0.id == id }) else { return }
        experiences[idx].name = trimmed
        experiences[idx].contactId = contactId?.isEmpty == true ? nil : contactId
        saveData()
    }

    public func toggleExperienceClosed(id: String) {
        guard let idx = experiences.firstIndex(where: { $0.id == id }) else { return }
        experiences[idx].closed.toggle()
        saveData()
    }

    public func transferExperience(id: String, to targetNotebookId: String) {
        guard let idx = experiences.firstIndex(where: { $0.id == id }) else { return }
        experiences[idx].notebookId = targetNotebookId
        experiences[idx].contactId = nil // Clear contact because contacts are notebook-scoped

        for tIdx in transactions.indices where transactions[tIdx].experienceId == id {
            transactions[tIdx].notebookId = targetNotebookId
            transactions[tIdx].contactId = nil
        }
        if transferRedirect {
            activeNotebookId = targetNotebookId
        }
        saveData()
    }

    public func deleteExperience(id: String) {
        experiences.removeAll { $0.id == id }
        transactions.removeAll { $0.experienceId == id }
        saveData()
    }

    // MARK: - Transaction Actions
    public func createTransaction(
        notebookId: String,
        contactId: String? = nil,
        experienceId: String? = nil,
        amount: Double,
        description: String? = nil,
        date: Date = Date()
    ) {
        guard abs(amount) > 0.0001 else { return }
        let trimmedDesc = description?.trimmingCharacters(in: .whitespacesAndNewlines)
        let tx = Transaction(
            notebookId: notebookId,
            contactId: contactId,
            experienceId: experienceId,
            amount: amount,
            description: trimmedDesc?.isEmpty == true ? nil : trimmedDesc,
            date: date
        )
        transactions.append(tx)
        saveData()
    }

    public func updateTransaction(
        id: String,
        amount: Double,
        description: String? = nil,
        date: Date
    ) {
        guard abs(amount) > 0.0001, let idx = transactions.firstIndex(where: { $0.id == id }) else { return }
        let trimmedDesc = description?.trimmingCharacters(in: .whitespacesAndNewlines)
        transactions[idx].amount = amount
        transactions[idx].description = trimmedDesc?.isEmpty == true ? nil : trimmedDesc
        transactions[idx].date = date
        saveData()
    }

    public func deleteTransaction(id: String) {
        transactions.removeAll { $0.id == id }
        saveData()
    }

    // MARK: - Semantic Search (Liquid Glass Search Conventions)
    public struct SearchResults: Sendable {
        public let contacts: [Contact]
        public let experiences: [Experience]
        public let transactions: [Transaction]

        public init(
            contacts: [Contact] = [],
            experiences: [Experience] = [],
            transactions: [Transaction] = []
        ) {
            self.contacts = contacts
            self.experiences = experiences
            self.transactions = transactions
        }

        public var isEmpty: Bool {
            contacts.isEmpty && experiences.isEmpty && transactions.isEmpty
        }

        public var totalCount: Int {
            contacts.count + experiences.count + transactions.count
        }
    }

    public func search(query: String) -> SearchResults {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else {
            return SearchResults()
        }
        let activeId = activeNotebook?.id
        let matchedContacts = contacts.filter {
            ($0.notebookId == activeId || activeId == nil) &&
            ($0.name.lowercased().contains(q) || ($0.phone?.lowercased().contains(q) ?? false))
        }
        let matchedExperiences = experiences.filter {
            ($0.notebookId == activeId || activeId == nil) &&
            $0.name.lowercased().contains(q)
        }
        let matchedTransactions = transactions.filter {
            ($0.notebookId == activeId || activeId == nil) &&
            (($0.description?.lowercased().contains(q) ?? false) ||
             String(format: "%.2f", abs($0.amount)).contains(q))
        }
        return SearchResults(
            contacts: matchedContacts,
            experiences: matchedExperiences,
            transactions: matchedTransactions
        )
    }

    // MARK: - Security & Pin Pad Logic
    public func setPin(_ pin: String) {
        guard pin.count == 6 else { return }
        let salt = UUID().uuidString
        let hash = hashString(pin + salt)
        UserDefaults.standard.set(hash, forKey: lockHashKey)
        UserDefaults.standard.set(salt, forKey: lockSaltKey)
        UserDefaults.standard.set(true, forKey: lockEnabledKey)
        isLockConfigured = true
        isAppLocked = false
    }

    public func verifyPin(_ pin: String) -> Bool {
        guard let storedHash = UserDefaults.standard.string(forKey: lockHashKey),
              let storedSalt = UserDefaults.standard.string(forKey: lockSaltKey) else {
            return false
        }
        return hashString(pin + storedSalt) == storedHash
    }

    public func disablePin(withCurrentPin pin: String) -> Bool {
        guard verifyPin(pin) else { return false }
        UserDefaults.standard.removeObject(forKey: lockEnabledKey)
        UserDefaults.standard.removeObject(forKey: lockHashKey)
        UserDefaults.standard.removeObject(forKey: lockSaltKey)
        isLockConfigured = false
        isAppLocked = false
        return true
    }

    public func unlockApp(withPin pin: String) -> Bool {
        if verifyPin(pin) {
            isAppLocked = false
            return true
        }
        return false
    }

    public func lockApp() {
        if isLockConfigured {
            isAppLocked = true
        }
    }

    private func hashString(_ value: String) -> String {
        let digest = SHA256.hash(data: Data(value.utf8))
        return digest.compactMap { String(format: "%02x", $0) }.joined()
    }

    // MARK: - Persistence
    private func loadSettings() {
        let isLock = UserDefaults.standard.bool(forKey: lockEnabledKey)
        isLockConfigured = isLock
        isAppLocked = isLock

        if let themeStr = UserDefaults.standard.string(forKey: themeKey),
           let theme = AppThemeMode(rawValue: themeStr) {
            themeMode = theme
        }
        if let langStr = UserDefaults.standard.string(forKey: languageKey),
           let lang = AppLanguage(rawValue: langStr) {
            language = lang
        }
        amountsHiddenByDefault = UserDefaults.standard.bool(forKey: amountsDefaultKey)
        isAmountsHidden = amountsHiddenByDefault
        transferRedirect = UserDefaults.standard.object(forKey: transferRedirectKey) as? Bool ?? true
    }

    public func updateTheme(_ mode: AppThemeMode) {
        themeMode = mode
        UserDefaults.standard.set(mode.rawValue, forKey: themeKey)
    }

    public func updateLanguage(_ lang: AppLanguage) {
        language = lang
        UserDefaults.standard.set(lang.rawValue, forKey: languageKey)
    }

    public func updateAmountsHiddenDefault(_ hidden: Bool) {
        amountsHiddenByDefault = hidden
        UserDefaults.standard.set(hidden, forKey: amountsDefaultKey)
    }

    public func updateTransferRedirect(_ redirect: Bool) {
        transferRedirect = redirect
        UserDefaults.standard.set(redirect, forKey: transferRedirectKey)
    }

    private func saveData() {
        let encoder = JSONEncoder()
        if let encoded = try? encoder.encode(notebooks) {
            UserDefaults.standard.set(encoded, forKey: notebooksKey)
        }
        if let activeId = activeNotebookId {
            UserDefaults.standard.set(activeId, forKey: activeNotebookKey)
        }
        if let encoded = try? encoder.encode(contacts) {
            UserDefaults.standard.set(encoded, forKey: contactsKey)
        }
        if let encoded = try? encoder.encode(experiences) {
            UserDefaults.standard.set(encoded, forKey: experiencesKey)
        }
        if let encoded = try? encoder.encode(transactions) {
            UserDefaults.standard.set(encoded, forKey: transactionsKey)
        }
    }

    private func loadData() {
        let decoder = JSONDecoder()

        if let data = UserDefaults.standard.data(forKey: notebooksKey),
           let saved = try? decoder.decode([Notebook].self, from: data) {
            notebooks = saved
        }
        if let active = UserDefaults.standard.string(forKey: activeNotebookKey) {
            activeNotebookId = active
        }
        if let data = UserDefaults.standard.data(forKey: contactsKey),
           let saved = try? decoder.decode([Contact].self, from: data) {
            contacts = saved
        }
        if let data = UserDefaults.standard.data(forKey: experiencesKey),
           let saved = try? decoder.decode([Experience].self, from: data) {
            experiences = saved
        }
        if let data = UserDefaults.standard.data(forKey: transactionsKey),
           let saved = try? decoder.decode([Transaction].self, from: data) {
            transactions = saved
        }

        // Preload rich sample seed data if first launch
        if notebooks.isEmpty {
            seedSampleData()
        }
    }

    private func seedSampleData() {
        let personal = Notebook(name: "Personal", order: 0)
        let travel = Notebook(name: "Travel & Trip", order: 1)
        notebooks = [personal, travel]
        activeNotebookId = personal.id

        let adam = Contact(notebookId: personal.id, name: "Adam Mansour", phone: "+212 600-112233")
        let sara = Contact(notebookId: personal.id, name: "Sara Alami", phone: "+212 611-445566")
        let karim = Contact(notebookId: personal.id, name: "Karim Bennani", phone: "+212 622-778899")
        contacts = [adam, sara, karim]

        let dinner = Experience(notebookId: personal.id, contactId: adam.id, name: "Dinner at Marina", closed: false)
        let gifts = Experience(notebookId: personal.id, contactId: sara.id, name: "Birthday Gift Split", closed: true)
        experiences = [dinner, gifts]

        let now = Date()
        transactions = [
            Transaction(notebookId: personal.id, contactId: adam.id, amount: 250.0, description: "Lent for Groceries", date: now.addingTimeInterval(-86400 * 2)),
            Transaction(notebookId: personal.id, contactId: sara.id, amount: -120.0, description: "Coffee & snacks", date: now.addingTimeInterval(-86400)),
            Transaction(notebookId: personal.id, contactId: karim.id, amount: 480.0, description: "Concert tickets", date: now.addingTimeInterval(-86400 * 3)),
            Transaction(notebookId: personal.id, experienceId: dinner.id, amount: 320.0, description: "Main course & dessert", date: now.addingTimeInterval(-3600 * 5)),
            Transaction(notebookId: personal.id, contactId: sara.id, experienceId: gifts.id, amount: 150.0, description: "Shared present", date: now.addingTimeInterval(-86400 * 5))
        ]
        saveData()
    }
}
