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
        #if compiler(>=6.2)
        if #available(iOS 26.0, *) {
            pressHaptics(nativeBody(configuration: configuration), configuration: configuration)
        } else {
            pressHaptics(fallbackBody(configuration: configuration), configuration: configuration)
        }
        #else
        pressHaptics(fallbackBody(configuration: configuration), configuration: configuration)
        #endif
    }

    private func pressHaptics<V: View>(_ view: V, configuration: Configuration) -> some View {
        view.onChange(of: configuration.isPressed) { _, isPressed in
            if isPressed {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            }
        }
    }

    /// iOS 26+: native Liquid Glass via `glassEffect` (tinted `.regular` for prominent,
    /// `.clear` for plain glass), with the system interactive press behavior.
    #if compiler(>=6.2)
    @available(iOS 26.0, *)
    @ViewBuilder
    private func nativeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(size.font)
            .padding(.vertical, size.verticalPadding)
            .padding(.horizontal, size.horizontalPadding)
            .contentShape(ConcentricRectangle(cornerRadius: cornerRadius))
            .foregroundStyle(foregroundStyle)
            .glassEffect(glassVariant, in: ConcentricRectangle(cornerRadius: cornerRadius))
    }

    @available(iOS 26.0, *)
    private var glassVariant: Glass {
        switch variant {
        case .prominent: return .regular.tint(AppTheme.primary).interactive()
        case .danger: return .regular.tint(AppTheme.danger).interactive()
        case .glass: return .regular.interactive()
        case .clear: return .clear.interactive()
        }
    }
    #endif

    /// Pre-iOS 26: native system materials and tint fills.
    @ViewBuilder
    private func fallbackBody(configuration: Configuration) -> some View {
        configuration.label
            .font(size.font)
            .padding(.vertical, size.verticalPadding)
            .padding(.horizontal, size.horizontalPadding)
            .contentShape(ConcentricRectangle(cornerRadius: cornerRadius))
            .foregroundStyle(foregroundStyle)
            .background(fallbackBackground, in: ConcentricRectangle(cornerRadius: cornerRadius))
    }

    private var foregroundStyle: Color {
        switch variant {
        case .prominent, .danger:
            return .white
        case .glass, .clear:
            return .primary
        }
    }

    private var fallbackBackground: AnyShapeStyle {
        switch variant {
        case .prominent:
            return AnyShapeStyle(AppTheme.primary)
        case .danger:
            return AnyShapeStyle(AppTheme.danger)
        case .glass:
            return AnyShapeStyle(.regularMaterial)
        case .clear:
            return AnyShapeStyle(.ultraThinMaterial)
        }
    }
}

// MARK: - ButtonStyle Extensions (Apple Liquid Glass HIG Specification)
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

    func tapFeedback() -> some View {
        self.modifier(TouchFeedbackModifier())
    }

    func dismissKeyboardOnTap() -> some View {
        self.modifier(DismissKeyboardOnTapModifier())
    }

    func glassInputStyle(cornerRadius: CGFloat = AppTheme.radiusInput) -> some View {
        self
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .liquidGlass(style: .input, cornerRadius: cornerRadius)
            .tapFeedback()
    }

    /// Native modal presentation: system sheet with detents and drag indicator.
    /// On iOS 26+ the system sheet already renders with the native Liquid Glass
    /// treatment and animations — no custom background overrides.
    func liquidGlassSheet(
        detents: Set<PresentationDetent> = [.large],
        cornerRadius: CGFloat = AppTheme.radiusSheet
    ) -> some View {
        self
            .presentationDetents(detents)
            .presentationDragIndicator(.visible)
    }

    /// Content-fitted modal presentation: measures the (fixed-size) content once
    /// and sizes the sheet to wrap it exactly — no dead space below the content,
    /// and a shorter sheet gives the keyboard room so it lifts instead of
    /// growing to full height. Still a partial detent, so the native Liquid
    /// Glass floating treatment is preserved on iOS 26+.
    ///
    /// - Parameter chrome: Extra points for the navigation bar and grabber area.
    func fittedLiquidGlassSheet(chrome: CGFloat = 60) -> some View {
        modifier(FittedLiquidGlassSheetModifier(chrome: chrome))
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

// MARK: - Content-Fitted Liquid Glass Sheet
public struct FittedLiquidGlassSheetModifier: ViewModifier {
    @State private var contentHeight: CGFloat = 370
    @State private var hasMeasured = false
    let chrome: CGFloat

    public init(chrome: CGFloat) {
        self.chrome = chrome
    }

    public func body(content: Content) -> some View {
        content
            .fixedSize(horizontal: false, vertical: true)
            .background(
                GeometryReader { proxy -> Color in
                    DispatchQueue.main.async {
                        guard !hasMeasured, proxy.size.height > 0 else { return }
                        hasMeasured = true
                        var transaction = Transaction()
                        transaction.disablesAnimations = true
                        withTransaction(transaction) {
                            contentHeight = proxy.size.height
                        }
                    }
                    return Color.clear
                }
            )
            .presentationDetents([.height(contentHeight + chrome)])
            .presentationDragIndicator(.visible)
    }
}

// MARK: - Touch Feedback (Haptics on Touch Down for Menus, Buttons, and Inputs)
public struct TouchFeedbackModifier: ViewModifier {
    public init() {}

    public func body(content: Content) -> some View {
        content
            .overlay(TouchFeedbackOverlay())
            .simultaneousGesture(
                TapGesture().onEnded {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                }
            )
    }
}

private struct TouchFeedbackOverlay: UIViewRepresentable {
    func makeUIView(context: Context) -> TouchFeedbackTrackingView {
        let view = TouchFeedbackTrackingView()
        view.backgroundColor = .clear
        view.isUserInteractionEnabled = true
        return view
    }

    func updateUIView(_ uiView: TouchFeedbackTrackingView, context: Context) {}
}

private final class TouchFeedbackTrackingView: UIView {
    private static var lastFeedbackTime: TimeInterval = 0

    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        if self.bounds.contains(point) {
            let now = CACurrentMediaTime()
            if now - Self.lastFeedbackTime > 0.25 {
                Self.lastFeedbackTime = now
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            }
        }
        return nil
    }
}

// MARK: - Keyboard Dismiss On Screen Tap (All Inputs)
public struct DismissKeyboardOnTapModifier: ViewModifier {
    public init() {}

    public func body(content: Content) -> some View {
        content
            .background(KeyboardDismissTrackingViewRepresentable())
            .simultaneousGesture(
                TapGesture().onEnded {
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                }
            )
    }
}

private struct KeyboardDismissTrackingViewRepresentable: UIViewRepresentable {
    func makeUIView(context: Context) -> KeyboardDismissTrackingUIView {
        let view = KeyboardDismissTrackingUIView()
        view.backgroundColor = .clear
        view.isUserInteractionEnabled = false
        return view
    }

    func updateUIView(_ uiView: KeyboardDismissTrackingUIView, context: Context) {}
}

private final class KeyboardDismissTrackingUIView: UIView, UIGestureRecognizerDelegate {
    private weak var activeWindow: UIWindow?
    private var tapRecognizer: UITapGestureRecognizer?

    override func didMoveToWindow() {
        super.didMoveToWindow()
        cleanup()
        guard let window = self.window else { return }
        self.activeWindow = window
        let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap))
        tap.cancelsTouchesInView = false
        tap.requiresExclusiveTouchType = false
        tap.delegate = self
        window.addGestureRecognizer(tap)
        self.tapRecognizer = tap
    }

    override func willMove(toWindow newWindow: UIWindow?) {
        super.willMove(toWindow: newWindow)
        if newWindow == nil {
            cleanup()
        }
    }

    private func cleanup() {
        if let tap = tapRecognizer, let win = activeWindow ?? tap.view {
            win.removeGestureRecognizer(tap)
        }
        tapRecognizer = nil
        activeWindow = nil
    }

    @objc private func handleTap() {
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }

    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
        var view: UIView? = touch.view
        while let current = view {
            if current is UITextField || current is UITextView || current is UISearchBar {
                return false
            }
            view = current.superview
        }
        return true
    }

    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool {
        return true
    }
}
