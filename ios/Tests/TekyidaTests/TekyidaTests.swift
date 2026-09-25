import XCTest
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
}
