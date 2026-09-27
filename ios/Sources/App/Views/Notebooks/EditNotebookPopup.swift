import SwiftUI

// MARK: - Edit Notebook Popup
struct EditNotebookPopup: View {
    @Environment(\.dismiss) private var dismiss
    let notebook: Notebook
    let onSave: (String) -> Void
    @State private var name: String

    init(notebook: Notebook, onSave: @escaping (String) -> Void) {
        self.notebook = notebook
        self.onSave = onSave
        _name = State(initialValue: notebook.name)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 18) {
                GlassInputField(
                    systemImage: "book.closed",
                    placeholder: tr("notebook.nameField"),
                    text: $name,
                    autocapitalization: .sentences,
                    characterLimit: 20
                )

                Text(tr("notebook.charLimit"))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                GlassButton(tr("common.saveChanges"), systemImage: "checkmark", style: .primary, size: .large) {
                    let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !trimmed.isEmpty else { return }
                    onSave(trimmed)
                    dismiss()
                }
                .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                .opacity(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.45 : 1.0)
                .padding(.top, 4)

                Spacer(minLength: 24)
            }
            .padding(20)
            .fittedLiquidGlassSheet(chrome: 60)
            .dismissKeyboardOnTap()
            .navigationTitle(tr("notebook.editTitle"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(tr("common.cancel")) {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        dismiss()
                    }
                }
            }
        }
    }
}
