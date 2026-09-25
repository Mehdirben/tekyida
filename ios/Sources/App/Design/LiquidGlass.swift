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
    let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        #if compiler(>=6.2)
        if #available(iOS 26.0, macOS 26.0, *) {
            // Native iOS 26+ GlassEffectContainer
            content
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
    @Environment(\.colorScheme) private var colorScheme
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
                content.glassEffect(.prominent, in: .rect(cornerRadius: cornerRadius))
            case .surface, .button, .input, .bar, .floating:
                content.glassEffect(.subtle, in: .rect(cornerRadius: cornerRadius))
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
        case .card:
            ConcentricRectangle(cornerRadius: cornerRadius)
                .fill(Color.glassBackground(for: colorScheme))
                .background(.ultraThinMaterial, in: ConcentricRectangle(cornerRadius: cornerRadius))

        case .surface:
            ConcentricRectangle(cornerRadius: cornerRadius)
                .fill(colorScheme == .dark ? Color.white.opacity(0.06) : Color.white.opacity(0.65))
                .background(.ultraThinMaterial, in: ConcentricRectangle(cornerRadius: cornerRadius))

        case .pill:
            Capsule(style: .continuous)
                .fill(colorScheme == .dark ? Color.white.opacity(0.09) : Color.white.opacity(0.72))
                .background(.ultraThinMaterial, in: Capsule(style: .continuous))

        case .button:
            ConcentricRectangle(cornerRadius: cornerRadius)
                .fill(colorScheme == .dark ? Color.white.opacity(0.12) : Color.white.opacity(0.82))
                .background(.thinMaterial, in: ConcentricRectangle(cornerRadius: cornerRadius))

        case .prominent:
            ConcentricRectangle(cornerRadius: cornerRadius)
                .fill(
                    LinearGradient(
                        colors: [AppTheme.primary, AppTheme.primaryDark],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

        case .input:
            ConcentricRectangle(cornerRadius: cornerRadius)
                .fill(colorScheme == .dark ? Color.black.opacity(0.28) : Color.white.opacity(0.55))
                .background(.thinMaterial, in: ConcentricRectangle(cornerRadius: cornerRadius))

        case .bar, .floating:
            ConcentricRectangle(cornerRadius: cornerRadius)
                .fill(colorScheme == .dark ? Color.black.opacity(0.4) : Color.white.opacity(0.75))
                .background(.ultraThinMaterial, in: ConcentricRectangle(cornerRadius: cornerRadius))
        }
    }

    @ViewBuilder
    private var specularHighlightRim: some View {
        let rimGradient = LinearGradient(
            stops: [
                .init(color: colorScheme == .dark ? Color.white.opacity(0.45) : Color.white.opacity(0.9), location: 0.0),
                .init(color: colorScheme == .dark ? Color.white.opacity(0.12) : Color.white.opacity(0.35), location: 0.45),
                .init(color: colorScheme == .dark ? Color.black.opacity(0.25) : Color.white.opacity(0.12), location: 1.0),
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )

        switch style {
        case .pill:
            Capsule(style: .continuous)
                .stroke(rimGradient, lineWidth: 1.2)
        default:
            ConcentricRectangle(cornerRadius: cornerRadius)
                .stroke(rimGradient, lineWidth: 1.2)
        }
    }

    private var shadowColor: Color {
        if colorScheme == .dark {
            return Color.black.opacity(0.4)
        } else {
            return Color(red: 90 / 255.0, green: 107 / 255.0, blue: 170 / 255.0).opacity(0.12)
        }
    }

    private var shadowRadius: CGFloat {
        switch style {
        case .card, .prominent: return 16
        case .floating: return 20
        case .surface, .bar: return 10
        case .pill: return 12
        case .button: return 8
        case .input: return 4
        }
    }

    private var shadowY: CGFloat {
        switch style {
        case .card, .prominent: return 8
        case .floating: return 10
        case .surface, .bar: return 4
        case .pill: return 6
        case .button: return 4
        case .input: return 2
        }
    }
}

// MARK: - Liquid Glass Button Style
public struct LiquidGlassButtonStyle: ButtonStyle {
    public enum Variant {
        case glass
        case prominent
        case danger
        case clear
    }

    public enum Size {
        case regular
        case large
        case extraLarge

        var verticalPadding: CGFloat {
            switch self {
            case .regular: return 10
            case .large: return 14
            case .extraLarge: return 18
            }
        }

        var horizontalPadding: CGFloat {
            switch self {
            case .regular: return 16
            case .large: return 20
            case .extraLarge: return 24
            }
        }

        var font: Font {
            switch self {
            case .regular: return .subheadline.weight(.semibold)
            case .large: return .headline.weight(.bold)
            case .extraLarge: return .title3.weight(.bold)
            }
        }
    }

    let variant: Variant
    let size: Size
    let cornerRadius: CGFloat
    @Environment(\.colorScheme) private var colorScheme

    public init(
        variant: Variant = .glass,
        size: Size = .large,
        cornerRadius: CGFloat = AppTheme.radiusButton
    ) {
        self.variant = variant
        self.size = size
        self.cornerRadius = cornerRadius
    }

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(size.font)
            .padding(.vertical, size.verticalPadding)
            .padding(.horizontal, size.horizontalPadding)
            .foregroundColor(foregroundColor)
            .background {
                backgroundShape(isPressed: configuration.isPressed)
            }
            .overlay {
                ConcentricRectangle(cornerRadius: cornerRadius)
                    .stroke(borderGradient(isPressed: configuration.isPressed), lineWidth: 1.2)
            }
            .shadow(color: shadowColor(isPressed: configuration.isPressed), radius: configuration.isPressed ? 4 : 10, x: 0, y: configuration.isPressed ? 2 : 5)
            .scaleEffect(configuration.isPressed ? 0.96 : 1.0)
            .animation(.spring(response: 0.22, dampingFraction: 0.68), value: configuration.isPressed)
    }

    @ViewBuilder
    private func backgroundShape(isPressed: Bool) -> some View {
        switch variant {
        case .prominent:
            LinearGradient(
                colors: isPressed
                    ? [AppTheme.primaryDark, AppTheme.primary]
                    : [AppTheme.primary, AppTheme.primaryDark],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .clipShape(ConcentricRectangle(cornerRadius: cornerRadius))

        case .glass:
            ConcentricRectangle(cornerRadius: cornerRadius)
                .fill(colorScheme == .dark ? Color.white.opacity(isPressed ? 0.16 : 0.1) : Color.white.opacity(isPressed ? 0.88 : 0.75))
                .background(.ultraThinMaterial, in: ConcentricRectangle(cornerRadius: cornerRadius))

        case .danger:
            LinearGradient(
                colors: isPressed
                    ? [AppTheme.danger.opacity(0.85), AppTheme.danger]
                    : [AppTheme.danger, AppTheme.danger.opacity(0.88)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .clipShape(ConcentricRectangle(cornerRadius: cornerRadius))

        case .clear:
            ConcentricRectangle(cornerRadius: cornerRadius)
                .fill(Color.white.opacity(isPressed ? 0.12 : 0.04))
                .background(.ultraThinMaterial, in: ConcentricRectangle(cornerRadius: cornerRadius))
        }
    }

    private var foregroundColor: Color {
        switch variant {
        case .prominent, .danger:
            return .white
        case .glass, .clear:
            return .primary
        }
    }

    private func borderGradient(isPressed: Bool) -> LinearGradient {
        LinearGradient(
            stops: [
                .init(color: colorScheme == .dark ? Color.white.opacity(isPressed ? 0.6 : 0.4) : Color.white.opacity(0.9), location: 0.0),
                .init(color: colorScheme == .dark ? Color.white.opacity(0.15) : Color.white.opacity(0.3), location: 0.5),
                .init(color: colorScheme == .dark ? Color.clear : Color.white.opacity(0.1), location: 1.0),
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private func shadowColor(isPressed: Bool) -> Color {
        switch variant {
        case .prominent:
            return AppTheme.primary.opacity(isPressed ? 0.2 : 0.35)
        case .danger:
            return AppTheme.danger.opacity(isPressed ? 0.2 : 0.35)
        case .glass, .clear:
            return colorScheme == .dark ? Color.black.opacity(0.3) : Color.black.opacity(0.08)
        }
    }
}

// MARK: - ButtonStyle Extensions
public extension ButtonStyle where Self == LiquidGlassButtonStyle {
    static var liquidGlass: LiquidGlassButtonStyle {
        LiquidGlassButtonStyle(variant: .glass)
    }

    static var liquidGlassProminent: LiquidGlassButtonStyle {
        LiquidGlassButtonStyle(variant: .prominent)
    }

    static var liquidGlassDanger: LiquidGlassButtonStyle {
        LiquidGlassButtonStyle(variant: .danger)
    }

    static var liquidGlassClear: LiquidGlassButtonStyle {
        LiquidGlassButtonStyle(variant: .clear)
    }

    static func liquidGlass(
        variant: LiquidGlassButtonStyle.Variant = .glass,
        size: LiquidGlassButtonStyle.Size = .large,
        cornerRadius: CGFloat = AppTheme.radiusButton
    ) -> LiquidGlassButtonStyle {
        LiquidGlassButtonStyle(variant: variant, size: size, cornerRadius: cornerRadius)
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
    }

    /// Configures modal presentation with the modern Liquid Glass inset sheet appearance
    func liquidGlassSheet(
        detents: Set<PresentationDetent> = [.large],
        cornerRadius: CGFloat = AppTheme.radiusSheet
    ) -> some View {
        self
            .presentationDetents(detents)
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(cornerRadius)
            .presentationBackground(.ultraThinMaterial)
    }

    /// Adopts tab bar minimize behavior on scroll down where available
    @ViewBuilder
    func tabBarMinimizeBehaviorOnScroll() -> some View {
        #if compiler(>=6.2)
        if #available(iOS 26.0, *) {
            self.tabBarMinimizeBehavior(.onScrollDown)
        } else {
            self
        }
        #else
        self
        #endif
    }
}
