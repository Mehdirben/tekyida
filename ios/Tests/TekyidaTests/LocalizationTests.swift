import XCTest
@testable import Tekyida

@MainActor
final class LocalizationTests: XCTestCase {
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

    func testAppTabStructure() {
        L10n.language = .english
        XCTAssertEqual(AppTab.allCases.count, 4)
        XCTAssertEqual(AppTab.dashboard.title, "Dashboard")
        XCTAssertEqual(AppTab.experiences.title, "Experiences")
        XCTAssertEqual(AppTab.search.title, "Search")
        XCTAssertEqual(AppTab.settings.title, "Settings")

        XCTAssertEqual(AppTab.search.icon, "magnifyingglass")
    }
}
