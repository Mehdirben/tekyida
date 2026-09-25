import SwiftUI

// MARK: - Liquid Glass Modifier
public struct LiquidGlassCardModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme
    let cornerRadius: CGFloat
    let interactive: Bool

    public func body(content: Content) -> some View {
        content
            .background {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(Color.glassBackground(for: colorScheme))
                    .background(
                        .ultraThinMaterial,
                        in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    )
            }
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(
                        LinearGradient(
                            stops: [
                                .init(color: Color.glassBorder(for: colorScheme), location: 0.0),
                                .init(color: Color.glassBorder(for: colorScheme).opacity(0.3), location: 0.5),
                                .init(color: Color.glassBorder(for: colorScheme).opacity(0.8), location: 1.0),
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            }
            .shadow(
                color: colorScheme == .dark ? Color.black.opacity(0.4) : Color.black.opacity(0.06),
                radius: 16,
                x: 0,
                y: 8
            )
            .shadow(
                color: colorScheme == .dark ? Color.black.opacity(0.2) : Color.black.opacity(0.03),
                radius: 4,
                x: 0,
                y: 2
            )
    }
}

// MARK: - Glass Flat Modifier (for list items & inner elements)
public struct LiquidGlassFlatModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme
    let cornerRadius: CGFloat

    public func body(content: Content) -> some View {
        content
            .background {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(colorScheme == .dark ? Color.white.opacity(0.05) : Color.white.opacity(0.45))
                    .background(
                        .thinMaterial,
                        in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    )
            }
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(Color.glassBorder(for: colorScheme).opacity(0.4), lineWidth: 0.8)
            }
    }
}

// MARK: - View Extensions for Liquid Glass
public extension View {
    func liquidGlassCard(cornerRadius: CGFloat = AppTheme.radiusCard, interactive: Bool = false) -> some View {
        modifier(LiquidGlassCardModifier(cornerRadius: cornerRadius, interactive: interactive))
    }

    func liquidGlassFlat(cornerRadius: CGFloat = AppTheme.radiusButton) -> some View {
        modifier(LiquidGlassFlatModifier(cornerRadius: cornerRadius))
    }

    func glassInputStyle(cornerRadius: CGFloat = AppTheme.radiusInput) -> some View {
        self
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(Color(UIColor.secondarySystemBackground).opacity(0.6))
                    .background(
                        .thinMaterial,
                        in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    )
            }
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
            }
    }
}
