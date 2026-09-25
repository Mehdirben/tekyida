import SwiftUI

// MARK: - Reusable Liquid Glass Button
public struct GlassButton: View {
    public enum Style {
        case primary
        case secondary
        case danger
        case clear

        var variant: LiquidGlassButtonStyle.Variant {
            switch self {
            case .primary: return .prominent
            case .secondary: return .glass
            case .danger: return .danger
            case .clear: return .clear
            }
        }
    }

    public enum Size {
        case regular
        case large
        case extraLarge

        var buttonSize: LiquidGlassButtonStyle.Size {
            switch self {
            case .regular: return .regular
            case .large: return .large
            case .extraLarge: return .extraLarge
            }
        }
    }

    let title: String
    let systemImage: String?
    let style: Style
    let size: Size
    let isFullWidth: Bool
    let action: () -> Void

    public init(
        _ title: String,
        systemImage: String? = nil,
        style: Style = .primary,
        size: Size = .large,
        isFullWidth: Bool = true,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.systemImage = systemImage
        self.style = style
        self.size = size
        self.isFullWidth = isFullWidth
        self.action = action
    }

    public var body: some View {
        Button(action: {
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            action()
        }) {
            HStack(spacing: 8) {
                if let systemImage = systemImage {
                    Image(systemName: systemImage)
                        .font(size == .extraLarge ? .title3.bold() : .subheadline.bold())
                }
                Text(title)
                    .lineLimit(1)
            }
            .frame(maxWidth: isFullWidth ? .infinity : nil)
        }
        .buttonStyle(
            .liquidGlass(
                variant: style.variant,
                size: size.buttonSize,
                cornerRadius: AppTheme.radiusButton
            )
        )
    }
}

// MARK: - Scale Touch Style (Preserved for backwards compatibility)
public struct ScaleTouchStyle: ButtonStyle {
    public init() {}
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.96 : 1.0)
            .animation(.spring(response: 0.22, dampingFraction: 0.7), value: configuration.isPressed)
    }
}
