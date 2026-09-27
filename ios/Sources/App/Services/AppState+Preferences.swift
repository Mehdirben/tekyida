import SwiftUI
import Combine

// MARK: - Preferences (Theme, Language, Defaults)
extension AppState {
    func loadSettings() {
        if let value = UserDefaults.standard.string(forKey: themeKey), let mode = AppThemeMode(rawValue: value) {
            themeMode = mode
        }
        if let value = UserDefaults.standard.string(forKey: languageKey), let selected = AppLanguage(rawValue: value) {
            language = selected
        }
        L10n.language = language
        amountsHiddenByDefault = UserDefaults.standard.bool(forKey: amountsDefaultKey)
        isAmountsHidden = amountsHiddenByDefault
        transferRedirect = UserDefaults.standard.object(forKey: transferRedirectKey) as? Bool ?? true
        activeNotebookId = UserDefaults.standard.string(forKey: activeNotebookKey)
    }

    public func updateTheme(_ mode: AppThemeMode) {
        themeMode = mode
        UserDefaults.standard.set(mode.rawValue, forKey: themeKey)
    }

    public func updateLanguage(_ lang: AppLanguage) {
        language = lang
        L10n.language = lang
        UserDefaults.standard.set(lang.rawValue, forKey: languageKey)
    }

    public func updateAmountsHiddenDefault(_ hidden: Bool) {
        amountsHiddenByDefault = hidden
        UserDefaults.standard.set(hidden, forKey: amountsDefaultKey)
    }

    public func updateTransferRedirect(_ redirect: Bool) {
        transferRedirect = redirect
        UserDefaults.standard.set(redirect, forKey: transferRedirectKey)
    }
}
