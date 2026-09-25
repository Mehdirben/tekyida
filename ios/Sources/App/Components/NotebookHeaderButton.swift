import SwiftUI

// MARK: - Reusable Notebook Header Menu
// Native dropdown menu anchored at the navigation bar: instant notebook
// switching with system checkmarks plus a manage action. On iOS 26+ the
// menu label sits on the toolbar's own Liquid Glass; below iOS 26 it
// draws its own material pill.
public struct NotebookHeaderButton: View {
    let notebooks: [Notebook]
    @Binding var activeNotebookId: String?
    let onManage: () -> Void

    public init(
        notebooks: [Notebook],
        activeNotebookId: Binding<String?>,
        onManage: @escaping () -> Void
    ) {
        self.notebooks = notebooks
        self._activeNotebookId = activeNotebookId
        self.onManage = onManage
    }

    public var body: some View {
        Menu {
            Picker("Notebook", selection: $activeNotebookId) {
                ForEach(notebooks) { notebook in
                    Text(notebook.name).tag(notebook.id as String?)
                }
            }

            Divider()

            Button {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                onManage()
            } label: {
                Label("Manage Notebooks", systemImage: "slider.horizontal.3")
            }
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "book.closed.fill")
                    .font(.subheadline)
                    .foregroundStyle(.tint)

                Text(currentName)
                    .font(.subheadline.bold())
                    .foregroundColor(.primary)
                    .lineLimit(1)

                Image(systemName: "chevron.down")
                    .font(.caption2.bold())
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .liquidGlassPill()
        }
    }

    private var currentName: String {
        notebooks.first(where: { $0.id == activeNotebookId })?.name ?? "Select Notebook"
    }
}