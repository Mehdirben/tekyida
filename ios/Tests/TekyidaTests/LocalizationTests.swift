import Testing
@testable import Tekyida

// Serialized: mutates the global `L10n.language`.
@Suite("Localization", .serialized)
@MainActor
struct LocalizationTests {
    @Test("Language switch updates translations")
    func languageSwitchUpdatesTranslations() {
        L10n.language = .english
        #expect(tr("tab.settings") == "Settings")

        L10n.language = .french
        #expect(tr("tab.settings") == "Paramètres")
        #expect(tr("transaction.theyOweYou") == "Vous doit")

        L10n.language = .english
        #expect(AppThemeMode.dark.title == "Dark")
        L10n.language = .french
        #expect(AppThemeMode.dark.title == "Sombre")

        L10n.language = .english
    }

    @Test("Unknown keys fall back to the raw key without crashing")
    func missingKeyFallsBackToKey() {
        L10n.language = .english
        #expect(tr("test.nonexistentKey") == "test.nonexistentKey")
        L10n.language = .french
        #expect(tr("test.nonexistentKey") == "test.nonexistentKey")
        L10n.language = .english
    }

    @Test("App tab structure")
    func appTabStructure() {
        L10n.language = .english
        #expect(AppTab.allCases.count == 4)
        #expect(AppTab.dashboard.title == "Dashboard")
        #expect(AppTab.experiences.title == "Experiences")
        #expect(AppTab.search.title == "Search")
        #expect(AppTab.settings.title == "Settings")
        #expect(AppTab.search.icon == "magnifyingglass")
    }
}
