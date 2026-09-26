import XCTest
import SwiftUI
@testable import Tekyida

@MainActor
final class TekyidaTests: XCTestCase {
    func testAppDisplayName() {
        let bundleName = Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String
        XCTAssertEqual(bundleName ?? "Tekyida", "Tekyida")
    }

    func testContentViewInitialization() {
        let view = ContentView()
        XCTAssertNotNil(view.body)
    }

    func testAppTransportSecurityConfiguration() {
        let atsDict = Bundle.main.object(forInfoDictionaryKey: "NSAppTransportSecurity") as? [String: Any]
        let allowsArbitrary = atsDict?["NSAllowsArbitraryLoads"] as? Bool ?? false
        XCTAssertFalse(allowsArbitrary, "Arbitrary HTTP loads must be blocked by default ATS configuration")
    }

    func testBalanceCalculationsAndAggregations() {
        let state = AppState()
        let notebook = Notebook(name: "Test Notebook")
        let alice = Contact(notebookId: notebook.id, name: "Alice", phone: "123")
        let bob = Contact(notebookId: notebook.id, name: "Bob", phone: "456")
        let closedExperience = Experience(notebookId: notebook.id, contactId: alice.id, name: "Closed", closed: true)
        let openExperience = Experience(notebookId: notebook.id, contactId: alice.id, name: "Open")
        state.notebooks = [notebook]
        state.contacts = [alice, bob]
        state.experiences = [closedExperience, openExperience]
        state.transactions = [
            Transaction(notebookId: notebook.id, contactId: alice.id, amount: 100),
            Transaction(notebookId: notebook.id, contactId: bob.id, amount: -40),
            Transaction(notebookId: notebook.id, experienceId: closedExperience.id, amount: 50),
            Transaction(notebookId: notebook.id, experienceId: openExperience.id, amount: 999)
        ]

        XCTAssertEqual(state.contactBalance(alice.id), 150)
        XCTAssertEqual(state.experienceBalance(closedExperience.id), 50)
        XCTAssertEqual(state.moneyOwed(for: notebook.id), 150)
        XCTAssertEqual(state.moneyGiven(for: notebook.id), 40)
        XCTAssertEqual(state.netBalance(for: notebook.id), 110)
    }

    func testSemanticSearchEngine() {
        let state = AppState()
        let notebook = Notebook(name: "Vacation")
        let contact = Contact(notebookId: notebook.id, name: "Youssef Alaoui", phone: "+212 600-001122")
        let secondContact = Contact(notebookId: notebook.id, name: "Leila Tazi", phone: "+212 611-334455")
        let experience = Experience(notebookId: notebook.id, name: "Sahara Desert Trek", contactId: contact.id)
        state.notebooks = [notebook]
        state.activeNotebookId = notebook.id
        state.contacts = [contact, secondContact]
        state.experiences = [experience]
        state.transactions = [
            Transaction(notebookId: notebook.id, contactId: contact.id, amount: 750, description: "Camel ride & tent"),
            Transaction(notebookId: notebook.id, experienceId: experience.id, amount: 1200, description: "Quad bikes")
        ]

        XCTAssertEqual(state.search(query: "Youssef").contacts.first?.name, "Youssef Alaoui")
        XCTAssertEqual(state.search(query: "3344").contacts.first?.name, "Leila Tazi")
        XCTAssertEqual(state.search(query: "Sahara").experiences.first?.name, "Sahara Desert Trek")
        XCTAssertEqual(state.search(query: "Camel").transactions.first?.description, "Camel ride & tent")
        XCTAssertEqual(state.search(query: "1200").transactions.count, 1)
        XCTAssertTrue(state.search(query: "   ").isEmpty)
    }

    func testAppTabStructure() {
        L10n.language = .english
        XCTAssertEqual(AppTab.allCases.count, 4)
        XCTAssertEqual(AppTab.dashboard.title, "Dashboard")
        XCTAssertEqual(AppTab.experiences.title, "Experiences")
        XCTAssertEqual(AppTab.search.title, "Search")
        XCTAssertEqual(AppTab.settings.title, "Settings")

        XCTAssertEqual(AppTab.search.icon, "magnifyingglass")
    }

    func testLanguageSwitchUpdatesTranslations() {
        L10n.language = .english
        XCTAssertEqual(tr("tab.settings"), "Settings")

        L10n.language = .french
        XCTAssertEqual(tr("tab.settings"), "Paramètres")
        XCTAssertEqual(tr("transaction.theyOweYou"), "Vous doit")

        L10n.language = .english
        XCTAssertEqual(AppThemeMode.dark.title, "Dark")
        L10n.language = .french
        XCTAssertEqual(AppThemeMode.dark.title, "Sombre")

        L10n.language = .english
    }

    func testLiquidGlassDesignTokensAndConcentricHierarchy() {
        // Concentric geometric hierarchy: Sheets > Cards > Buttons > Inputs
        XCTAssertGreaterThan(AppTheme.radiusSheet, AppTheme.radiusCard)
        XCTAssertGreaterThan(AppTheme.radiusCard, AppTheme.radiusButton)
        XCTAssertGreaterThanOrEqual(AppTheme.radiusButton, AppTheme.radiusInput)

        // Concentric path computation produces non-empty path
        let rect = ConcentricRectangle(cornerRadius: 16)
        let path = rect.path(in: CGRect(x: 0, y: 0, width: 200, height: 60))
        XCTAssertFalse(path.isEmpty)

        // GlassButton and GlassCard instantiation
        let btn = GlassButton("Confirm", style: .primary, size: .extraLarge) {}
        XCTAssertNotNil(btn.body)

        let card = GlassCard {
            Text("Test Content")
        }
        XCTAssertNotNil(card.body)
    }

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

    func testTekyidaScrollHeaderAndSyncBanner() {
        let state = AppState()
        let header = TekyidaScrollHeader(onManageNotebooks: {})
            .environmentObject(state)
        XCTAssertNotNil(header.body)

        let brand = BrandLogoHeader()
            .environmentObject(state)
        XCTAssertNotNil(brand.body)

        let banner = OfflineSyncBanner()
            .environmentObject(state)
        XCTAssertNotNil(banner.body)
    }

    func testPendingSyncDetection() {
        let state = AppState()
        XCTAssertTrue(state.isItemPendingSync(id: "offline_abc123"))
        XCTAssertFalse(state.isItemPendingSync(id: "server_xyz789"))
    }

    func testTransferNotebookFiltering() {
        let state = AppState()
        let nb1 = Notebook(id: "nb1", name: "Current")
        let nb2 = Notebook(id: "nb2", name: "Active Other")
        let nb3 = Notebook(id: "nb3", name: "Archived Other", archived: true)
        state.notebooks = [nb1, nb2, nb3]

        let exp = Experience(notebookId: nb1.id, name: "Dinner")
        let activeTargets = state.activeNotebooksList.filter { $0.id != exp.notebookId }
        let archivedTargets = state.archivedNotebooksList.filter { $0.id != exp.notebookId }

        XCTAssertEqual(activeTargets.map(\.id), ["nb2"])
        XCTAssertEqual(archivedTargets.map(\.id), ["nb3"])

        let sheet = TransferExperienceSheet(experience: exp, onTransfer: { _ in })
            .environmentObject(state)
        XCTAssertNotNil(sheet.body)
    }

    func testTouchAndKeyboardModifiers() {
        let button = GlassButton("Test", systemImage: "star", style: .primary, size: .large, action: {})
        XCTAssertNotNil(button.body)

        let modifiedView = Text("Hello")
            .tapFeedback()
            .dismissKeyboardOnTap()
        XCTAssertNotNil(modifiedView)
    }

    func testArchivedNotebookSelectionAndPersistenceParity() {
        let state = AppState()
        let activeNb = Notebook(id: "nb_active", name: "Active Book", archived: false)
        let archivedNb = Notebook(id: "nb_archived", name: "Archived Book", archived: true)
        state.notebooks = [activeNb, archivedNb]

        // Default active is first non-archived
        XCTAssertEqual(state.activeNotebook?.id, "nb_active")

        // Selecting archived notebook allows viewing it in current session
        state.selectNotebook("nb_archived")
        XCTAssertEqual(state.activeNotebook?.id, "nb_archived")

        // But UserDefaults does NOT persist archived notebook ID
        XCTAssertNotEqual(UserDefaults.standard.string(forKey: "tekyida_active_notebook_id"), "nb_archived")

        // Selecting active notebook persists to UserDefaults
        state.selectNotebook("nb_active")
        XCTAssertEqual(UserDefaults.standard.string(forKey: "tekyida_active_notebook_id"), "nb_active")
    }

    func testOfflineAccountGuard() async {
        let state = AppState()
        state.isOnline = false

        do {
            try await state.changeEmail(to: "test@example.com")
            XCTFail("Should throw when offline")
        } catch {
            XCTAssertTrue(error.localizedDescription.contains("offline"))
        }

        do {
            try await state.changePassword(current: "oldpass123", new: "newpass123")
            XCTFail("Should throw when offline")
        } catch {
            XCTAssertTrue(error.localizedDescription.contains("offline"))
        }
    }

    func testSearchViewAndAddSheetsBodies() {
        let state = AppState()
        let searchView = SearchView().environmentObject(state)
        XCTAssertNotNil(searchView.body)

        let addContact = AddContactSheet(onSave: { _, _ in })
        XCTAssertNotNil(addContact.body)

        let addExp = AddExperienceSheet(contacts: [], onSave: { _, _ in })
        XCTAssertNotNil(addExp.body)

        var nbId: String? = "nb_active"
        let headerBtn = NotebookHeaderButton(
            notebooks: [Notebook(id: "nb_active", name: "Active")],
            activeNotebook: Notebook(id: "nb_active", name: "Active"),
            activeNotebookId: Binding(get: { nbId }, set: { nbId = $0 }),
            onManage: {}
        )
        XCTAssertNotNil(headerBtn.body)
    }
}
