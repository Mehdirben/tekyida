import SwiftUI

// MARK: - Reusable Empty State (native ContentUnavailableView)
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
        ContentUnavailableView {
            Label(title, systemImage: systemImage)
        } description: {
            Text(subtitle)
        }
    }
}
