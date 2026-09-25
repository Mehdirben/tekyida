import SwiftUI

// MARK: - Reusable Glass Empty State View
public struct GlassEmptyStateView: View {
    let systemImage: String
    let title: String
    let subtitle: String

    public init(systemImage: String, title: String, subtitle: String) {
        self.systemImage = systemImage
        self.title = title
        self.subtitle = subtitle
    }

    public var body: some View {
        VStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.system(size: 32))
                .foregroundColor(AppTheme.primary.opacity(0.6))
            Text(title)
                .font(.subheadline.bold())
                .foregroundColor(.secondary)
            Text(subtitle)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(32)
        .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
    }
}
