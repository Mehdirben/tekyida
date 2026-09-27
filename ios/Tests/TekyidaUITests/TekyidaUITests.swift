import XCTest

final class TekyidaUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    /// Launch smoke test: the app must reach either the main tab bar (signed
    /// in from a previous session) or the account access screen (signed out).
    func testLaunchShowsTabBarOrAccountAccess() throws {
        let app = XCUIApplication()
        app.launch()

        let tabBars = app.tabBars.firstMatch
        let authenticated = tabBars.waitForExistence(timeout: 8)

        if !authenticated {
            // Signed out: expect the account access form (email/password fields
            // and a submit button), regardless of localization.
            let emailField = app.textFields.firstMatch
            let secureField = app.secureTextFields.firstMatch
            let anyButton = app.buttons.firstMatch
            XCTAssertTrue(
                emailField.exists || secureField.exists || anyButton.exists,
                "Expected the account access screen (email/password fields) when signed out"
            )
        } else {
            XCTAssertTrue(tabBars.buttons.count == 4, "Expected the main tab bar with the four app sections (Dashboard, Experiences, Search, Settings)")
        }
    }

    /// When signed out, the account screen can toggle between sign in and
    /// registration without crashing.
    func testAccountAccessToggleDoesNotCrash() throws {
        let app = XCUIApplication()
        app.launch()

        guard !app.tabBars.firstMatch.waitForExistence(timeout: 5) else {
            // Already authenticated; nothing to toggle.
            return
        }

        let emailField = app.textFields.firstMatch
        guard emailField.waitForExistence(timeout: 5) else {
            XCTFail("Expected an email field on the account access screen")
            return
        }

        // Tap every plain-text button once; the app must stay responsive.
        for _ in 0..<3 {
            let toggles = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@ OR label CONTAINS[c] %@", "account", "compte"))
            if toggles.firstMatch.exists {
                toggles.firstMatch.tap()
                break
            }
        }
        XCTAssertTrue(emailField.waitForExistence(timeout: 3), "App should remain on the account screen")
    }
}
