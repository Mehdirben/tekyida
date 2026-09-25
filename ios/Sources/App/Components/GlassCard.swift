import SwiftUI

// MARK: - Reusable Liquid Glass Card Container
public struct GlassCard<Content: View>: View {
    let cornerRadius: CGFloat
    let padding: CGFloat
    let isInteractive: Bool
    let content: Content

    public init(
        cornerRadius: CGFloat = AppTheme.radiusCard,
        padding: CGFloat = 16,
        isInteractive: Bool = false,
        @ViewBuilder content: () -> Content
    ) {
        self.cornerRadius = cornerRadius
        self.padding = padding
        self.isInteractive = isInteractive
        self.content = content()
    }

    public var body: some View {
        content
            .padding(padding)
            .liquidGlassCard(cornerRadius: cornerRadius, interactive: isInteractive)
    }
}
