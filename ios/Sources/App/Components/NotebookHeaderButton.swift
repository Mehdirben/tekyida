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
            .modifier(ConditionalPillBackground())
        }
    }

    private var currentName: String {
        notebooks.first(where: { $0.id == activeNotebookId })?.name ?? "Select Notebook"
    }
}

// MARK: - Version-Adaptive Button Chrome
/// Applies the material pill only on pre-iOS 26 (no double glass on the
/// system Liquid Glass toolbar); plain on iOS 26+.
struct ConditionalPillBackground: ViewModifier {
    func body(content: Content) -> some View {
        #if compiler(>=6.2)
        if #available(iOS 26.0, *) {
            content
        } else {
            content.liquidGlassPill()
        }
        #else
        content.liquidGlassPill()
        #endif
    }
}

/// Scale press feedback only where the custom pill is used; iOS 26+ gets the
/// native glass press interaction instead.
