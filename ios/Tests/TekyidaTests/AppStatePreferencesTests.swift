import Testing
import Foundation
@testable import Tekyida

// Serialized: language updates mutate the global `L10n.language`.
@Suite("AppState Preferences", .serialized)
@MainActor
struct AppStatePreferencesTests {
    private let backend = MockBackend()
    private let cache = TestSupport.makeTemporaryCache()
    private let isolated: (defaults: UserDefaults, suiteName: String)
    private var state: AppState {
        AppState(
            backend: backend,
            offlineCache: cache,
            defaults: isolated.defaults,
            startSideEffects: false
        )
    }

    init() {
        isolated = TestSupport.makeIsolatedDefaults()
    }

    @Test("Defaults are used when nothing is persisted")
    func factoryDefaults() {
        let fresh = state
        #expect(fresh.themeMode == .system)
        #expect(fresh.language == .english)
        #expect(fresh.amountsHiddenByDefault == false)
        #expect(fresh.transferRedirect == true, "unset transfer redirect defaults to true")
        #expect(fresh.activeNotebookId == nil)
    }

    @Test("updateTheme persists and restores across sessions")
    func themePersistence() {
        state.updateTheme(.dark)
        #expect(isolated.defaults.string(forKey: "tekyida_theme_mode") == "dark")

        let restored = state
        #expect(restored.themeMode == .dark)
    }

    @Test("updateLanguage persists and restores across sessions")
    func languagePersistence() {
        state.updateLanguage(.french)
        #expect(isolated.defaults.string(forKey: "tekyida_language") == "fr")
        #expect(L10n.language == .french, "in-app language updates live")

        let restored = state
        #expect(restored.language == .french)
        L10n.language = .english
    }

    @Test("Amounts-hidden default persists and seeds isAmountsHidden")
    func amountsHiddenPersistence() {
        state.updateAmountsHiddenDefault(true)
        #expect(isolated.defaults.bool(forKey: "tekyida_amounts_hidden_default") == true)

        let restored = state
        #expect(restored.amountsHiddenByDefault == true)
        #expect(restored.isAmountsHidden == true, "loadSettings seeds the runtime mask from the default")
    }

    @Test("Transfer redirect persists")
    func transferRedirectPersistence() {
        state.updateTransferRedirect(false)
        #expect(isolated.defaults.object(forKey: "tekyida_transfer_redirect") != nil,
                "explicit false must still be persisted")

        let restored = state
        #expect(restored.transferRedirect == false)
    }
}
