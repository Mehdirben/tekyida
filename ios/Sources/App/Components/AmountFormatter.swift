import Foundation

// MARK: - Amount Formatting Logic
// Pure formatting rules extracted from `AmountView` so masking, sign, and
// currency behavior stay unit-testable without rendering SwiftUI views.

enum AmountFormatter {
    enum Tone {
        case accent
        case danger
        case neutral
    }

    static func displayText(
        amount: Double,
        isHidden: Bool,
        showPlusSign: Bool = true,
        showsCurrency: Bool = true
    ) -> String {
        let currency = showsCurrency ? " MAD" : ""
        if isHidden {
            return "••••"
        }
        let sign = (amount > 0 && showPlusSign) ? "+" : ""
        return String(format: "%@%.2f%@", sign, amount, currency)
    }

    static func tone(for amount: Double) -> Tone {
        if amount > 0 {
            return .accent
        } else if amount < 0 {
            return .danger
        } else {
            return .neutral
        }
    }
}
