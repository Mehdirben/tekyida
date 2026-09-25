import SwiftUI

// MARK: - Amount Formatter Component
public struct AmountView: View {
    let amount: Double
    let isHidden: Bool
    let showPlusSign: Bool
    let font: Font
    let fontWeight: Font.Weight
    let customColor: Color?

    public init(
        amount: Double,
        isHidden: Bool,
        showPlusSign: Bool = true,
        font: Font = .body,
        fontWeight: Font.Weight = .semibold,
        customColor: Color? = nil
    ) {
        self.amount = amount
        self.isHidden = isHidden
        self.showPlusSign = showPlusSign
        self.font = font
        self.fontWeight = fontWeight
        self.customColor = customColor
    }

    public var body: some View {
        Text(displayText)
            .font(font)
            .fontWeight(fontWeight)
            .foregroundColor(resolvedColor)
            .contentTransition(.numericText())
    }

    private var displayText: String {
        if isHidden {
            return "•••• MAD"
        }
        let sign = (amount > 0 && showPlusSign) ? "+" : ""
        return String(format: "%@%.2f MAD", sign, amount)
    }

    private var resolvedColor: Color {
        if let custom = customColor {
            return custom
        }
        if amount > 0 {
            return AppTheme.accent
        } else if amount < 0 {
            return AppTheme.danger
        } else {
            return .primary
        }
    }
}
