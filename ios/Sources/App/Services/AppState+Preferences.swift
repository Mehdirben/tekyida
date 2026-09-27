import SwiftUI
import Combine

// MARK: - Preferences (Theme, Language, Defaults)
extension AppState {
    /// - Parameter applyGlobalLanguage: `false` in tests so constructing an
    ///   isolated `AppState` never mutates the global `L10n.language` while
    ///   localization tests run in parallel.
    func loadSettings(applyGlobalLanguage: Bool = true) {
        if let value = defaults.string(forKey: themeKey), let mode = AppThemeMode(rawValue: value) {
            themeMode = mode
        }
        if let value = defaults.string(forKey: languageKey), let selected = AppLanguage(rawValue: value) {
            language = selected
        }
        if applyGlobalLanguage {
            L10n.language = language
        }
        amountsHiddenByDefault = defaults.bool(forKey: amountsDefaultKey)
        isAmountsHidden = amountsHiddenByDefault
        transferRedirect = defaults.object(forKey: transferRedirectKey) as? Bool ?? true
        activeNotebookId = defaults.string(forKey: activeNotebookKey)
    }

    public func updateTheme(_ mode: AppThemeMode) {
        themeMode = mode
        defaults.set(mode.rawValue, forKey: themeKey)
    }

    public func updateLanguage(_ lang: AppLanguage) {
        language = lang
        L10n.language = lang
        defaults.set(lang.rawValue, forKey: languageKey)
    }

    public func updateAmountsHiddenDefault(_ hidden: Bool) {
        amountsHiddenByDefault = hidden
        defaults.set(hidden, forKey: amountsDefaultKey)
    }

    public func updateTransferRedirect(_ redirect: Bool) {
        transferRedirect = redirect
        defaults.set(redirect, forKey: transferRedirectKey)
    }
}
