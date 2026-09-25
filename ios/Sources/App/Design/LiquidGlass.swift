import SwiftUI

// MARK: - Apple Liquid Glass Style
public enum LiquidGlassStyle {
    case card
    case surface
    case pill
    case button
    case input
}

// MARK: - Native Apple Liquid Glass ViewModifier
public struct LiquidGlassModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme
    let style: LiquidGlassStyle
    let cornerRadius: CGFloat

    public init(style: LiquidGlassStyle = .card, cornerRadius: CGFloat = 20) {
        self.style = style
        self.cornerRadius = cornerRadius
    }

    public func body(content: Content) -> some View {
        content
            .background {
                glassBackground
            }
            .overlay {
                specularHighlightRim
            }
            .shadow(color: shadowColor, radius: shadowRadius, x: 0, y: shadowY)
    }

    @ViewBuilder
    private var glassBackground: some View {
        switch style {
        case .card, .surface:
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(colorScheme == .dark ? Color.white.opacity(0.06) : Color.white.opacity(0.65))
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))

        case .pill:
            Capsule(style: .continuous)
                .fill(colorScheme == .dark ? Color.white.opacity(0.08) : Color.white.opacity(0.7))
                .background(.ultraThinMaterial, in: Capsule(style: .continuous))

        case .button:
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(colorScheme == .dark ? Color.white.opacity(0.1) : Color.white.opacity(0.8))
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))

        case .input:
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(colorScheme == .dark ? Color.black.opacity(0.25) : Color.white.opacity(0.5))
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        }
    }

    @ViewBuilder
    private var specularHighlightRim: some View {
        let rimGradient = LinearGradient(
            stops: [
                .init(color: colorScheme == .dark ? Color.white.opacity(0.35) : Color.white.opacity(0.8), location: 0.0),
                .init(color: colorScheme == .dark ? Color.white.opacity(0.1) : Color.white.opacity(0.3), location: 0.45),
                .init(color: colorScheme == .dark ? Color.black.opacity(0.2) : Color.white.opacity(0.1), location: 1.0),
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )

        switch style {
        case .pill:
            Capsule(style: .continuous)
                .stroke(rimGradient, lineWidth: 1)
        default:
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .stroke(rimGradient, lineWidth: 1)
        }
    }

    private var shadowColor: Color {
        if colorScheme == .dark {
            return Color.black.opacity(0.35)
        } else {
            return Color(red: 90 / 255.0, green: 107 / 255.0, blue: 170 / 255.0).opacity(0.12)
        }
    }

    private var shadowRadius: CGFloat {
        switch style {
        case .card: return 16
        case .surface: return 8
        case .pill: return 12
        case .button: return 8
        case .input: return 4
        }
    }

    private var shadowY: CGFloat {
        switch style {
        case .card: return 8
        case .surface: return 4
        case .pill: return 6
        case .button: return 4
        case .input: return 2
        }
    }
}

// MARK: - View Extensions for Native Liquid Glass
public extension View {
    func liquidGlass(style: LiquidGlassStyle = .card, cornerRadius: CGFloat = 20) -> some View {
        modifier(LiquidGlassModifier(style: style, cornerRadius: cornerRadius))
    }

    func liquidGlassCard(cornerRadius: CGFloat = AppTheme.radiusCard, interactive: Bool = false) -> some View {
        liquidGlass(style: .card, cornerRadius: cornerRadius)
    }

    func liquidGlassFlat(cornerRadius: CGFloat = AppTheme.radiusButton) -> some View {
        liquidGlass(style: .surface, cornerRadius: cornerRadius)
    }

    func glassInputStyle(cornerRadius: CGFloat = AppTheme.radiusInput) -> some View {
        self
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .liquidGlass(style: .input, cornerRadius: cornerRadius)
    }

    func liquidGlassSheet(detents: Set<PresentationDetent> = [.large]) -> some View {
        self
            .presentationDetents(detents)
            .presentationDragIndicator(.visible)
            .presentationBackground(.ultraThinMaterial)
    }
}
