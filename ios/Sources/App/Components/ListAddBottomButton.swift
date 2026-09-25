import SwiftUI

// MARK: - Reusable List Add Bottom Button (Modern Liquid Glass HIG)
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
        GlassButton(
            title,
            systemImage: systemImage,
            style: .primary,
            size: .large,
            isFullWidth: true,
            action: action
        )
    }
}
