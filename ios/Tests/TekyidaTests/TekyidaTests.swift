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
}
