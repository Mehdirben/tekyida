import SwiftUI

// MARK: - Reusable Notebook Header Menu
// Native dropdown menu for switching notebooks or opening notebook management.
// The compact label uses the app's liquid glass pill style.
public struct NotebookHeaderButton: View {
    let notebooks: [Notebook]
    let activeNotebook: Notebook?
    @Binding var activeNotebookId: String?
    let onManage: () -> Void

    public init(
        notebooks: [Notebook],
        activeNotebook: Notebook? = nil,
        activeNotebookId: Binding<String?>,
        onManage: @escaping () -> Void
    ) {
        self.notebooks = notebooks
        self.activeNotebook = activeNotebook
        self._activeNotebookId = activeNotebookId
        self.onManage = onManage
    }

    public var body: some View {
        Menu {
            Picker("Notebook", selection: Binding(
                get: { activeNotebookId },
                set: { newValue in
                    UISelectionFeedbackGenerator().selectionChanged()
                    activeNotebookId = newValue
                }
            )) {
                ForEach(notebooks) { notebook in
                    Text(notebook.name).tag(notebook.id as String?)
                }
            }

            Divider()

            Button {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                onManage()
            } label: {
                HStack(spacing: 5) {
                    Image(systemName: "slider.horizontal.3")
                    Text("Manage Notebooks")
                }
                .font(.subheadline)
                .fixedSize()
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
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .contentShape(Capsule())
            .liquidGlassPill()
        }
        .contentShape(Capsule())
        .tapFeedback()
    }

    private var currentName: String {
        if let active = activeNotebook {
            return active.archived ? "\(active.name) (Archived)" : active.name
        }
        return notebooks.first(where: { $0.id == activeNotebookId })?.name ?? "Select Notebook"
    }
}