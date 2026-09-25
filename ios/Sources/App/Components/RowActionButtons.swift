import SwiftUI

public struct RowActionButtons: View {
    public var onEdit: () -> Void
    public var onTransfer: (() -> Void)?
    public var onDelete: () -> Void
    public var showsChevron: Bool

    public init(
        onEdit: @escaping () -> Void,
        onTransfer: (() -> Void)? = nil,
        onDelete: @escaping () -> Void,
        showsChevron: Bool = false
    ) {
        self.onEdit = onEdit
        self.onTransfer = onTransfer
        self.onDelete = onDelete
        self.showsChevron = showsChevron
    }

    public var body: some View {
        HStack(spacing: 6) {
            Button(action: {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                onEdit()
            }) {
                Image(systemName: "pencil")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(AppTheme.primary)
                    .frame(width: 30, height: 30)
                    .liquidGlassPill()
            }

            if let onTransfer = onTransfer {
                Button(action: {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    onTransfer()
                }) {
                    Image(systemName: "arrow.right.arrow.left")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(AppTheme.primary)
                        .frame(width: 30, height: 30)
                        .liquidGlassPill()
                }
            }

            Button(action: {
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                onDelete()
            }) {
                Image(systemName: "trash")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(AppTheme.danger.opacity(0.85))
                    .frame(width: 30, height: 30)
                    .liquidGlassPill()
            }

            if showsChevron {
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.secondary.opacity(0.55))
            }
        }
    }
}
