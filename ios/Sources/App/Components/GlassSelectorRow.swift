import SwiftUI

// MARK: - Language-Selector-Style Row (title left, glass pill menu right)
public struct GlassSelectorRow<MenuContent: View>: View {
    let title: String
    let systemImage: String?
    let selectedTitle: String
    let menuContent: () -> MenuContent

    public init(
        title: String,
        systemImage: String? = nil,
        selectedTitle: String,
        @ViewBuilder menuContent: @escaping () -> MenuContent
    ) {
        self.title = title
        self.systemImage = systemImage
        self.selectedTitle = selectedTitle
        self.menuContent = menuContent
    }

    public var body: some View {
        HStack {
            if let systemImage {
                Label(title, systemImage: systemImage)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                Text(title)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Menu {
                menuContent()
            } label: {
                HStack(spacing: 6) {
                    Text(selectedTitle)
                        .font(.subheadline.bold())
                        .foregroundColor(.primary)
                        .lineLimit(1)
                    Image(systemName: "chevron.down")
                        .font(.caption2.bold())
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .contentShape(Capsule())
                .liquidGlassPill()
            }
            .tint(.primary)
            .contentShape(Capsule())
            .tapFeedback()
        }
    }
}
