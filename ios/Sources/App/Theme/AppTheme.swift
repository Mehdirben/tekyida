import SwiftUI

// MARK: - App Color Theme & Modern Liquid Glass Tokens
public enum AppTheme {
    // Primary Brand Colors
    public static let primary = Color(red: 90 / 255.0, green: 107 / 255.0, blue: 170 / 255.0)
    public static let primaryLight = Color(red: 112 / 255.0, green: 129 / 255.0, blue: 191 / 255.0)
    public static let primaryDark = Color(red: 67 / 255.0, green: 82 / 255.0, blue: 136 / 255.0)

    // Positive / Money Owed To You (Green Accent)
    public static let accent = Color(red: 16 / 255.0, green: 185 / 255.0, blue: 129 / 255.0)
    public static let accentLight = Color(red: 52 / 255.0, green: 211 / 255.0, blue: 153 / 255.0)
    public static let accentBg = Color(red: 16 / 255.0, green: 185 / 255.0, blue: 129 / 255.0, opacity: 0.14)

    // Negative / Money You Owe (Rose Danger)
    public static let danger = Color(red: 244 / 255.0, green: 63 / 255.0, blue: 94 / 255.0)
    public static let dangerLight = Color(red: 251 / 255.0, green: 113 / 255.0, blue: 133 / 255.0)
    public static let dangerBg = Color(red: 244 / 255.0, green: 63 / 255.0, blue: 94 / 255.0, opacity: 0.14)

    // Warning / Closed Experiences / Pending (Amber)
    public static let warning = Color(red: 245 / 255.0, green: 158 / 255.0, blue: 11 / 255.0)
    public static let warningBg = Color(red: 245 / 255.0, green: 158 / 255.0, blue: 11 / 255.0, opacity: 0.14)

    // Hardware-Concentric Corner Radii (Aligned with modern Apple design)
    public static let radiusCard: CGFloat = 24
    public static let radiusPill: CGFloat = 999
    public static let radiusButton: CGFloat = 18
    public static let radiusInput: CGFloat = 16
    public static let radiusSheet: CGFloat = 28
    public static let radiusLarge: CGFloat = 32
}

// MARK: - Color Semantic Helpers
public extension Color {
    static func dynamicBackground(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark
            ? Color(red: 14 / 255.0, green: 16 / 255.0, blue: 27 / 255.0)
            : Color(red: 245 / 255.0, green: 247 / 255.0, blue: 252 / 255.0)
    }
}
