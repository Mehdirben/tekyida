import SwiftUI

// MARK: - Reusable List Add Bottom Button
public struct ListAddBottomButton: View {
    let title: String
    let systemImage: String
    let action: () -> Void

    public init(title: String, systemImage: String, action: @escaping () -> Void) {
        self.title = title
        self.systemImage = systemImage
        self.action = action
    }

    public var body: some View {
        Button(action: {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        }) {
            HStack(spacing: 8) {
                Image(systemName: systemImage)
                    .font(.system(size: 15, weight: .semibold))

                Text(title)
                    .font(.subheadline.bold())
            }
            .foregroundColor(AppTheme.primary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
        }
        .buttonStyle(ScaleTouchStyle())
    }
}
