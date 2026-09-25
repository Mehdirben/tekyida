import XCTest
import SwiftUI
@testable import Tekyida

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
        // Clear sample data for a pristine test scenario
        state.notebooks.removeAll()
        state.contacts.removeAll()
        state.experiences.removeAll()
        state.transactions.removeAll()

        state.createNotebook(name: "Test Notebook")
        let nbId = state.notebooks.first!.id

        state.createContact(notebookId: nbId, name: "Alice", phone: "123")
        state.createContact(notebookId: nbId, name: "Bob", phone: "456")
        let aliceId = state.contacts.first(where: { $0.name == "Alice" })!.id
        let bobId = state.contacts.first(where: { $0.name == "Bob" })!.id

        // Direct transactions: Alice owes 100, user owes Bob 40
        state.createTransaction(notebookId: nbId, contactId: aliceId, amount: 100.0)
        state.createTransaction(notebookId: nbId, contactId: bobId, amount: -40.0)

        // Open experience with 50.0 MAD should NOT affect contact balance
        state.createExperience(notebookId: nbId, name: "Lunch", contactId: aliceId)
        let lunchExp = state.experiences.first(where: { $0.name == "Lunch" })!
        state.createTransaction(notebookId: nbId, experienceId: lunchExp.id, amount: 50.0)

        XCTAssertEqual(state.contactBalance(aliceId), 100.0)
        XCTAssertEqual(state.experienceBalance(lunchExp.id), 50.0)

        // Close the experience -> now it must be included in Alice's contact balance (100 + 50 = 150)
        state.toggleExperienceClosed(id: lunchExp.id)
        XCTAssertEqual(state.contactBalance(aliceId), 150.0)

        // QuickStats assertions
        XCTAssertEqual(state.moneyOwed(for: nbId), 150.0)
        XCTAssertEqual(state.moneyGiven(for: nbId), 40.0)
        XCTAssertEqual(state.netBalance(for: nbId), 110.0)
    }

    func testCascadingDeletionsAndTransfer() {
        let state = AppState()
        state.notebooks.removeAll()
        state.contacts.removeAll()
        state.experiences.removeAll()
        state.transactions.removeAll()

        state.createNotebook(name: "Notebook A")
        state.createNotebook(name: "Notebook B")
        let nbAId = state.notebooks.first(where: { $0.name == "Notebook A" })!.id
        let nbBId = state.notebooks.first(where: { $0.name == "Notebook B" })!.id

        state.createContact(notebookId: nbAId, name: "Charlie")
        let charlieId = state.contacts.first!.id

        state.createExperience(notebookId: nbAId, name: "Road Trip", contactId: charlieId)
        let expId = state.experiences.first!.id
        state.createTransaction(notebookId: nbAId, experienceId: expId, amount: 200.0)

        // Verify Experience Transfer to Notebook B unlinks Charlie (notebook-scoped)
        state.transferExperience(id: expId, to: nbBId)
        let transferred = state.experiences.first(where: { $0.id == expId })!
        XCTAssertEqual(transferred.notebookId, nbBId)
        XCTAssertNil(transferred.contactId)

        // Cascading deletion of Notebook B removes transferred experience and transactions
        state.deleteNotebook(id: nbBId)
        XCTAssertFalse(state.experiences.contains(where: { $0.id == expId }))
        XCTAssertFalse(state.transactions.contains(where: { $0.experienceId == expId }))
    }

    func testSecurityAndPinManagement() {
        let state = AppState()
        let pin = "123456"

        state.setPin(pin)
        XCTAssertTrue(state.isLockConfigured)
        XCTAssertTrue(state.verifyPin("123456"))
        XCTAssertFalse(state.verifyPin("654321"))

        state.lockApp()
        XCTAssertTrue(state.isAppLocked)

        XCTAssertFalse(state.unlockApp(withPin: "000000"))
        XCTAssertTrue(state.isAppLocked)

        XCTAssertTrue(state.unlockApp(withPin: pin))
        XCTAssertFalse(state.isAppLocked)

        XCTAssertTrue(state.disablePin(withCurrentPin: pin))
        XCTAssertFalse(state.isLockConfigured)
    }

    func testSemanticSearchEngine() {
        let state = AppState()
        state.notebooks.removeAll()
        state.contacts.removeAll()
        state.experiences.removeAll()
        state.transactions.removeAll()

        state.createNotebook(name: "Vacation")
        let nbId = state.notebooks.first!.id
        state.activeNotebookId = nbId

        state.createContact(notebookId: nbId, name: "Youssef Alaoui", phone: "+212 600-001122")
        state.createContact(notebookId: nbId, name: "Leila Tazi", phone: "+212 611-334455")
        let youssefId = state.contacts.first(where: { $0.name == "Youssef Alaoui" })!.id

        state.createExperience(notebookId: nbId, name: "Sahara Desert Trek", contactId: youssefId)
        let expId = state.experiences.first!.id

        state.createTransaction(notebookId: nbId, contactId: youssefId, amount: 750.0, description: "Camel ride & tent")
        state.createTransaction(notebookId: nbId, experienceId: expId, amount: 1200.0, description: "Quad bikes")

        // 1. Search by contact name
        let contactResults = state.search(query: "Youssef")
        XCTAssertEqual(contactResults.contacts.count, 1)
        XCTAssertEqual(contactResults.contacts.first?.name, "Youssef Alaoui")

        // 2. Search by phone substring
        let phoneResults = state.search(query: "3344")
        XCTAssertEqual(phoneResults.contacts.count, 1)
        XCTAssertEqual(phoneResults.contacts.first?.name, "Leila Tazi")

        // 3. Search by experience name
        let expResults = state.search(query: "Sahara")
        XCTAssertEqual(expResults.experiences.count, 1)
        XCTAssertEqual(expResults.experiences.first?.name, "Sahara Desert Trek")

        // 4. Search by transaction description
        let txResults = state.search(query: "Camel")
        XCTAssertEqual(txResults.transactions.count, 1)
        XCTAssertEqual(txResults.transactions.first?.description, "Camel ride & tent")

        // 5. Search by amount
        let amountResults = state.search(query: "1200")
        XCTAssertEqual(amountResults.transactions.count, 1)

        // 6. Empty search query
        let emptyResults = state.search(query: "   ")
        XCTAssertTrue(emptyResults.isEmpty)
        XCTAssertEqual(emptyResults.totalCount, 0)
    }

    func testAppTabStructure() {
        XCTAssertEqual(AppTab.allCases.count, 4)
        XCTAssertEqual(AppTab.dashboard.title, "Dashboard")
        XCTAssertEqual(AppTab.experiences.title, "Experiences")
        XCTAssertEqual(AppTab.search.title, "Search")
        XCTAssertEqual(AppTab.settings.title, "Settings")

        XCTAssertEqual(AppTab.search.icon, "magnifyingglass")
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

    func testFloatingLiquidGlassBarNavigation() {
        var tab: AppTab = .dashboard
        let binding = Binding<AppTab>(get: { tab }, set: { tab = bash })
        let bar = FloatingLiquidGlassBar(selectedTab: binding)
        XCTAssertNotNil(bar.body)
    }
}
