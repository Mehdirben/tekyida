import SwiftUI

// MARK: - Reusable Full-Width Action Button (Form Submit / Bottom Action)
public struct GlassActionButton: View {
    let title: String
    let systemImage: String?
    let style: GlassButton.Style
    let isDisabled: Bool
    let action: () -> Void

    public init(
        _ title: String,
        systemImage: String? = nil,
        style: GlassButton.Style = .primary,
        isDisabled: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.systemImage = systemImage
        self.style = style
        self.isDisabled = isDisabled
        self.action = action
    }

    public var body: some View {
        GlassButton(
            title,
            systemImage: systemImage,
            style: style,
            action: action
        )
        .disabled(isDisabled)
        .opacity(isDisabled ? 0.45 : 1.0)
    }
}
