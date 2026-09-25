import SwiftUI

// MARK: - Reusable Status Badge
public struct StatusBadge: View {
    let title: String
    let systemImage: String?
    let color: Color
    let backgroundColor: Color

    public init(
        title: String,
        systemImage: String? = nil,
        color: Color,
        backgroundColor: Color
    ) {
        self.title = title
        self.systemImage = systemImage
        self.color = color
        self.backgroundColor = backgroundColor
    }

    public var body: some View {
        HStack(spacing: 4) {
            if let systemImage = systemImage {
                Image(systemName: systemImage)
                    .font(.system(size: 10, weight: .bold))
            }
            Text(title)
                .font(.system(size: 11, weight: .semibold))
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .foregroundColor(color)
        .background(backgroundColor)
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .stroke(color.opacity(0.3), lineWidth: 0.8)
        )
    }
}
