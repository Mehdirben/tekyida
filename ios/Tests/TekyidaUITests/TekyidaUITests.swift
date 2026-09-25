import XCTest

final class TekyidaUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testMainViewElementsAndInteraction() throws {
        let app = XCUIApplication()
        app.launch()

        // Verify title & navigation
        XCTAssertTrue(app.navigationBars["Tekyida"].exists || app.staticTexts["Tekyida"].exists)

        // Verify counter button and interact
        let tapButton = app.buttons["Tap Me"]
        if tapButton.waitForExistence(timeout: 3.0) {
            tapButton.tap()
            XCTAssertTrue(app.staticTexts["Counter: 1"].waitForExistence(timeout: 2.0))
        }
    }
}
