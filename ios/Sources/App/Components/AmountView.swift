import SwiftUI

// MARK: - Amount Formatter Component
public struct AmountView: View {
    let amount: Double
    let isHidden: Bool
    let showPlusSign: Bool
    let showsCurrency: Bool
    let font: Font
    let fontWeight: Font.Weight
    let customColor: Color?

    public init(
        amount: Double,
        isHidden: Bool,
        showPlusSign: Bool = true,
        showsCurrency: Bool = true,
        font: Font = .body,
        fontWeight: Font.Weight = .semibold,
        customColor: Color? = nil
    ) {
        self.amount = amount
        self.isHidden = isHidden
        self.showPlusSign = showPlusSign
        self.showsCurrency = showsCurrency
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
        AmountFormatter.displayText(
            amount: amount,
            isHidden: isHidden,
            showPlusSign: showPlusSign,
            showsCurrency: showsCurrency
        )
    }

    private var resolvedColor: Color {
        if let custom = customColor {
            return custom
        }
        switch AmountFormatter.tone(for: amount) {
        case .accent: return AppTheme.accent
        case .danger: return AppTheme.danger
        case .neutral: return .primary
        }
    }
}
