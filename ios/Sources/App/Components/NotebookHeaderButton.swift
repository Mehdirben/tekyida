import SwiftUI

// MARK: - Reusable Notebook Header Button
public struct NotebookHeaderButton: View {
    let notebookName: String
    let onTap: () -> Void

    public init(notebookName: String, onTap: @escaping () -> Void) {
        self.notebookName = notebookName
        self.onTap = onTap
    }

    public var body: some View {
        Button(action: {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            onTap()
        }) {
            HStack(spacing: 8) {
                Image(systemName: "book.closed.fill")
                    .font(.subheadline)
                    .foregroundColor(AppTheme.primary)

                Text(notebookName)
                    .font(.subheadline.bold())
                    .foregroundColor(.primary)

                Image(systemName: "chevron.down")
                    .font(.caption2.bold())
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background {
                Capsule()
                    .fill(Color.white.opacity(0.15))
                    .background(.ultraThinMaterial, in: Capsule())
            }
            .overlay {
                Capsule()
                    .stroke(Color.white.opacity(0.25), lineWidth: 1)
            }
        }
        .buttonStyle(ScaleTouchStyle())
    }
}
