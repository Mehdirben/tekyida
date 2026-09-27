import Testing
import Foundation
@testable import Tekyida

@Suite("Localization EN/FR Parity")
@MainActor
struct LocalizationParityTests {
    private static let formatSpecifiers: NSRegularExpression? = {
        try? NSRegularExpression(pattern: "%[@dDfFuUxXlsSaA]|%\\d+\\$[@dDfFuUxXlsSaA]")
    }()

    private func specifiers(in value: String) -> [String] {
        guard let regex = Self.formatSpecifiers else { return [] }
        let range = NSRange(value.startIndex..., in: value)
        return regex.matches(in: value, range: range).compactMap { Range($0.range, in: value).map { String(value[$0]) } }
    }

    @Test("Every English key has a French counterpart and vice versa")
    func keyParity() {
        let english = Set(L10n.englishKeys)
        let french = Set(L10n.frenchKeys)

        let missingInFrench = english.subtracting(french).sorted()
        let missingInEnglish = french.subtracting(english).sorted()

        #expect(missingInFrench.isEmpty, "Keys missing in French (silently fall back to English): \(missingInFrench)")
        #expect(missingInEnglish.isEmpty, "Keys missing in English: \(missingInEnglish)")
        #expect(english.count == french.count)
    }

    @Test("No translation is empty in either language")
    func nonEmptyValues() {
        for key in L10n.englishKeys {
            #expect(!(L10n.englishValue(key) ?? "").isEmpty, "Empty English value for \(key)")
        }
        for key in L10n.frenchKeys {
            #expect(!(L10n.frenchValue(key) ?? "").isEmpty, "Empty French value for \(key)")
        }
    }

    @Test("Format specifiers match across languages")
    func formatSpecifierParity() {
        for key in L10n.englishKeys {
            guard let englishValue = L10n.englishValue(key),
                  let frenchValue = L10n.frenchValue(key) else { continue }
            #expect(
                specifiers(in: englishValue).sorted() == specifiers(in: frenchValue).sorted(),
                "Format specifiers differ for \(key): EN '\(englishValue)' vs FR '\(frenchValue)'"
            )
        }
    }

    @Test("tr() resolves every key in both languages")
    func lookupResolvesEveryKey() {
        L10n.language = .english
        for key in L10n.englishKeys {
            #expect(tr(key) == L10n.englishValue(key), "English lookup diverged for \(key)")
        }

        L10n.language = .french
        for key in L10n.frenchKeys {
            #expect(tr(key) == L10n.frenchValue(key), "French lookup diverged for \(key)")
        }

        L10n.language = .english
    }

    @Test("The string table is meaningfully large")
    func tableIsPopulated() {
        #expect(L10n.englishKeys.count > 100, "English table unexpectedly shrank: \(L10n.englishKeys.count) keys")
        #expect(L10n.frenchKeys.count > 100, "French table unexpectedly shrank: \(L10n.frenchKeys.count) keys")
    }
}
