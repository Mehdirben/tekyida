import SwiftUI

// MARK: - Apple Liquid Glass Style
public enum LiquidGlassStyle: Sendable {
    case card
    case surface
    case pill
    case button
    case prominent
    case input
    case bar
    case floating
}

// MARK: - Concentric Rounded Rectangle Primitive
public struct ConcentricRectangle: Shape {
    public var cornerRadius: CGFloat
    public var isUniform: Bool

    public init(cornerRadius: CGFloat = AppTheme.radiusCard, isUniform: Bool = true) {
        self.cornerRadius = cornerRadius
        self.isUniform = isUniform
    }

    public func path(in rect: CGRect) -> Path {
        let maxRadius = min(rect.width, rect.height) / 2
        let effectiveRadius = min(cornerRadius, maxRadius)
        return Path(roundedRect: rect, cornerRadius: effectiveRadius, style: .continuous)
    }
}

// MARK: - Glass Effect Container
/// Combines custom Liquid Glass effects to improve rendering performance and fluid morphing.
public struct GlassEffectContainer<Content: View>: View {
    let spacing: CGFloat
    let content: Content

    public init(spacing: CGFloat = 0, @ViewBuilder content: () -> Content) {
        self.spacing = spacing
        self.content = content()
    }

    public var body: some View {
        #if compiler(>=6.2)
        if #available(iOS 26.0, macOS 26.0, *) {
            // Native iOS 26+ GlassEffectContainer for real glass blending & morphing
            SwiftUI.GlassEffectContainer(spacing: spacing) {
                content
            }
        } else {
            content
                .compositingGroup()
        }
        #else
        content
            .compositingGroup()
        #endif
    }
}

// MARK: - Native Apple Liquid Glass ViewModifier
public struct LiquidGlassModifier: ViewModifier {
    let style: LiquidGlassStyle
    let cornerRadius: CGFloat
    let isInteractive: Bool

    public init(
        style: LiquidGlassStyle = .card,
        cornerRadius: CGFloat = AppTheme.radiusCard,
        isInteractive: Bool = false
    ) {
        self.style = style
        self.cornerRadius = cornerRadius
        self.isInteractive = isInteractive
    }

    @ViewBuilder
    public func body(content: Content) -> some View {
        #if compiler(>=6.2)
        if #available(iOS 26.0, macOS 26.0, *) {
            switch style {
            case .pill:
                content.glassEffect(.regular, in: Capsule(style: .continuous))
            case .card:
                if isInteractive {
                    content.glassEffect(.regular.interactive(), in: .rect(cornerRadius: cornerRadius))
                } else {
                    content.glassEffect(.regular, in: .rect(cornerRadius: cornerRadius))
                }
            case .prominent:
                content.glassEffect(.regular.tint(AppTheme.primary), in: .rect(cornerRadius: cornerRadius))
            case .surface, .button, .bar, .floating:
                content.glassEffect(.regular, in: .rect(cornerRadius: cornerRadius))
            case .input:
                content.glassEffect(.clear, in: .rect(cornerRadius: cornerRadius))
            }
        } else {
            fallbackBody(content: content)
        }
        #else
        fallbackBody(content: content)
        #endif
    }

    @ViewBuilder
    private func fallbackBody(content: Content) -> some View {
        content
            .background { materialBackground }
    }

    /// Pre-iOS 26: classic native system materials.
    @ViewBuilder
    private var materialBackground: some View {
        switch style {
        case .card:
            ConcentricRectangle(cornerRadius: cornerRadius).fill(.regularMaterial)
        case .surface:
            ConcentricRectangle(cornerRadius: cornerRadius).fill(.ultraThinMaterial)
        case .pill:
            Capsule(style: .continuous).fill(.regularMaterial)
        case .button:
            ConcentricRectangle(cornerRadius: cornerRadius).fill(.thinMaterial)
        case .prominent:
            ConcentricRectangle(cornerRadius: cornerRadius).fill(AppTheme.primary)
        case .input:
            ConcentricRectangle(cornerRadius: cornerRadius).fill(Color(uiColor: .secondarySystemFill))
        case .bar, .floating:
            ConcentricRectangle(cornerRadius: cornerRadius).fill(.ultraThinMaterial)
        }
    }
}

// MARK: - View Extensions for Native Liquid Glass
public extension View {
    func liquidGlass(
        style: LiquidGlassStyle = .card,
        cornerRadius: CGFloat = AppTheme.radiusCard,
        interactive: Bool = false
    ) -> some View {
        modifier(LiquidGlassModifier(style: style, cornerRadius: cornerRadius, isInteractive: interactive))
    }

    func liquidGlassCard(
        cornerRadius: CGFloat = AppTheme.radiusCard,
        interactive: Bool = false
    ) -> some View {
        liquidGlass(style: .card, cornerRadius: cornerRadius, interactive: interactive)
    }

    func liquidGlassFlat(cornerRadius: CGFloat = AppTheme.radiusButton) -> some View {
        liquidGlass(style: .surface, cornerRadius: cornerRadius)
    }

    func liquidGlassProminent(cornerRadius: CGFloat = AppTheme.radiusButton) -> some View {
        liquidGlass(style: .prominent, cornerRadius: cornerRadius)
    }

    func liquidGlassPill() -> some View {
        liquidGlass(style: .pill, cornerRadius: AppTheme.radiusPill)
    }

    func glassInputStyle(cornerRadius: CGFloat = AppTheme.radiusInput) -> some View {
        self
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .liquidGlass(style: .input, cornerRadius: cornerRadius)
            .tapFeedback()
    }
}
