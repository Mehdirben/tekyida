import SwiftUI

// MARK: - Reusable Glass Button
public struct GlassButton: View {
    public enum Style {
        case primary
        case secondary
        case danger
    }

    let title: String
    let systemImage: String?
    let style: Style
    let action: () -> Void

    public init(
        _ title: String,
        systemImage: String? = nil,
        style: Style = .primary,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.systemImage = systemImage
        self.style = style
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
                        .font(.subheadline.bold())
                }
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .padding(.horizontal, 16)
            .background {
                backgroundShape
            }
            .foregroundColor(foregroundColor)
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.radiusButton, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: AppTheme.radiusButton, style: .continuous)
                    .stroke(borderStroke, lineWidth: 1)
            }
            .shadow(color: shadowColor, radius: 8, x: 0, y: 4)
        }
        .buttonStyle(ScaleTouchStyle())
    }

    @ViewBuilder
    private var backgroundShape: some View {
        switch style {
        case .primary:
            LinearGradient(
                colors: [AppTheme.primary, AppTheme.primaryDark],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case .secondary:
            Color.white.opacity(0.12)
                .background(.thinMaterial)
        case .danger:
            LinearGradient(
                colors: [AppTheme.danger, AppTheme.danger.opacity(0.85)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    private var foregroundColor: Color {
        switch style {
        case .primary, .danger:
            return .white
        case .secondary:
            return .primary
        }
    }

    private var borderStroke: Color {
        switch style {
        case .primary:
            return Color.white.opacity(0.25)
        case .secondary:
            return Color.white.opacity(0.15)
        case .danger:
            return Color.white.opacity(0.2)
        }
    }

    private var shadowColor: Color {
        switch style {
        case .primary:
            return AppTheme.primary.opacity(0.3)
        case .secondary:
            return Color.black.opacity(0.05)
        case .danger:
            return AppTheme.danger.opacity(0.3)
        }
    }
}

// MARK: - Scale Touch Style
public struct ScaleTouchStyle: ButtonStyle {
    public init() {}
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.96 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}
