import SwiftUI

// MARK: - Notebook Manager Sheet
public struct NotebookManagerSheet: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var newNotebookName: String = ""
    @State private var isCreating: Bool = false
    @State private var editingNotebookId: String?
    @State private var editingNotebookName: String = ""
    @State private var showArchived: Bool = false
    @State private var deleteConfirmNotebook: Notebook?

    public init() {}

    public var body: some View {
        NavigationStack {
            ZStack {
                MeshGradientBackground()

                ScrollView {
                    VStack(spacing: 20) {
                        // Section 1: Active Notebooks
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Active Notebooks")
                                .font(.caption.bold())
                                .foregroundColor(.secondary)
                                .textCase(.uppercase)
                                .padding(.horizontal, 4)

                            ForEach(state.activeNotebooksList) { notebook in
                                notebookRow(notebook, isArchived: false)
                            }
                        }

                        // Section 2: Create New Notebook
                        if isCreating {
                            VStack(spacing: 12) {
                                TextField("Notebook Name (max 20)", text: $newNotebookName)
                                    .glassInputStyle()
                                    .onChange(of: newNotebookName) { _, newVal in
                                        if newVal.count > 20 {
                                            newNotebookName = String(newVal.prefix(20))
                                        }
                                    }

                                HStack(spacing: 8) {
                                    Button("Cancel") {
                                        newNotebookName = ""
                                        isCreating = false
                                    }
                                    .font(.subheadline.bold())
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 10)
                                    .liquidGlassFlat(cornerRadius: AppTheme.radiusButton)
                                    .foregroundColor(.secondary)

                                    Button("Create") {
                                        createNotebook()
                                    }
                                    .font(.subheadline.bold())
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 10)
                                    .background(AppTheme.primary, in: RoundedRectangle(cornerRadius: AppTheme.radiusButton, style: .continuous))
                                    .foregroundColor(.white)
                                    .disabled(newNotebookName.trimmingCharacters(in: .whitespaces).isEmpty)
                                }
                            }
                            .padding(14)
                            .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
                        } else {
                            Button(action: {
                                isCreating = true
                            }) {
                                HStack(spacing: 8) {
                                    Image(systemName: "plus")
                                    Text("New Notebook")
                                }
                                .font(.subheadline.bold())
                                .foregroundColor(AppTheme.primary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
                            }
                        }

                        // Section 3: Archived Notebooks Toggle
                        if !state.archivedNotebooksList.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                Button(action: {
                                    withAnimation { showArchived.toggle() }
                                }) {
                                    HStack {
                                        Image(systemName: showArchived ? "archivebox.fill" : "archivebox")
                                        Text(showArchived ? "Hide Archived Notebooks" : "Show Archived Notebooks (\(state.archivedNotebooksList.count))")
                                            .font(.caption.bold())
                                        Spacer()
                                        Image(systemName: showArchived ? "chevron.up" : "chevron.down")
                                            .font(.caption)
                                    }
                                    .foregroundColor(.secondary)
                                    .padding(.horizontal, 4)
                                }

                                if showArchived {
                                    ForEach(state.archivedNotebooksList) { notebook in
                                        notebookRow(notebook, isArchived: true)
                                    }
                                }
                            }
                        }
                    }
                    .padding(20)
                }
            }
            .navigationTitle("Notebooks")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .alert(
                "Delete Notebook?",
                isPresented: Binding(
                    get: { deleteConfirmNotebook != nil },
                    set: { if !$0 { deleteConfirmNotebook = nil } }
                ),
                actions: {
                    Button("Cancel", role: .cancel) {
                        deleteConfirmNotebook = nil
                    }
                    Button("Delete", role: .destructive) {
                        if let nb = deleteConfirmNotebook {
                            state.deleteNotebook(id: nb.id)
                            deleteConfirmNotebook = nil
                        }
                    }
                },
                message: {
                    Text("This will permanently delete '\(deleteConfirmNotebook?.name ?? "")' and all its contacts, experiences, and transactions.")
                }
            )
        }
    }

    private func notebookRow(_ notebook: Notebook, isArchived: Bool) -> some View {
        let isSelected = state.activeNotebookId == notebook.id
        let balance = state.notebookBalance(notebook.id)

        return HStack(spacing: 12) {
            Button(action: {
                if !isArchived {
                    state.activeNotebookId = notebook.id
                    dismiss()
                }
            }) {
                HStack(spacing: 12) {
                    Image(systemName: isSelected ? "checkmark.circle.fill" : "book.closed")
                        .font(.title3)
                        .foregroundColor(isSelected ? AppTheme.primary : .secondary)

                    VStack(alignment: .leading, spacing: 2) {
                        if editingNotebookId == notebook.id {
                            TextField("Name", text: $editingNotebookName)
                                .textFieldStyle(.plain)
                                .font(.headline)
                                .onSubmit { saveEdit(notebook.id) }
                        } else {
                            Text(notebook.name)
                                .font(.headline)
                                .foregroundColor(.primary)
                        }

                        AmountView(
                            amount: balance,
                            isHidden: state.isAmountsHidden,
                            font: .caption,
                            fontWeight: .semibold
                        )
                    }

                    Spacer()
                }
            }

            // Notebook Action Buttons
            HStack(spacing: 4) {
                if editingNotebookId == notebook.id {
                    Button(action: { saveEdit(notebook.id) }) {
                        Image(systemName: "checkmark")
                            .font(.caption.bold())
                            .foregroundColor(AppTheme.accent)
                            .frame(width: 28, height: 28)
                            .background(AppTheme.accentBg, in: Circle())
                    }
                } else {
                    Button(action: {
                        editingNotebookId = notebook.id
                        editingNotebookName = notebook.name
                    }) {
                        Image(systemName: "pencil")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .frame(width: 28, height: 28)
                            .background(Color.white.opacity(0.08), in: Circle())
                    }
                }

                Button(action: {
                    state.archiveNotebook(id: notebook.id, archived: !isArchived)
                }) {
                    Image(systemName: isArchived ? "tray.and.arrow.up" : "archivebox")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .frame(width: 28, height: 28)
                        .background(Color.white.opacity(0.08), in: Circle())
                }

                Button(action: {
                    deleteConfirmNotebook = notebook
                }) {
                    Image(systemName: "trash")
                        .font(.caption)
                        .foregroundColor(AppTheme.danger.opacity(0.8))
                        .frame(width: 28, height: 28)
                        .background(AppTheme.danger.opacity(0.1), in: Circle())
                }
            }
        }
        .padding(14)
        .liquidGlassFlat(cornerRadius: AppTheme.radiusCard)
    }

    private func createNotebook() {
        state.createNotebook(name: newNotebookName)
        newNotebookName = ""
        isCreating = false
    }

    private func saveEdit(_ id: String) {
        state.updateNotebook(id: id, name: editingNotebookName)
        editingNotebookId = nil
    }
}
