import SwiftUI

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
