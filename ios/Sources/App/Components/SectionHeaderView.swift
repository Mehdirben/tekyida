import SwiftUI

// MARK: - Reusable Section Header (Title + Count + Add Button)
public struct SectionHeaderView: View {
    let title: String
    let count: Int?
    let addButtonTitle: String
    let addButtonSystemImage: String
    let addAction: () -> Void

    public init(
        title: String,
        count: Int? = nil,
        addButtonTitle: String,
        addButtonSystemImage: String,
        addAction: @escaping () -> Void
    ) {
        self.title = title
        self.count = count
        self.addButtonTitle = addButtonTitle
        self.addButtonSystemImage = addButtonSystemImage
        self.addAction = addAction
    }

    public var body: some View {
        HStack {
            HStack(spacing: 8) {
                Text(title)
                    .font(.title3.bold())
                    .foregroundColor(.primary)

                if let count, count > 0 {
                    Text("\(count)")
                        .font(.caption.bold())
                        .foregroundColor(.secondary)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 4)
                        .background(Color(uiColor: .secondarySystemFill), in: Capsule())
                }
            }

            Spacer()

            GlassButton(
                addButtonTitle,
                systemImage: addButtonSystemImage,
                style: .primary,
                size: .regular,
                isFullWidth: false,
                action: addAction
            )
        }
        .padding(.horizontal, 4)
        .padding(.top, 4)
    }
}
