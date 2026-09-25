import SwiftUI

// MARK: - Notebook Manager Sheet (Modern Liquid Glass HIG)
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
            ScrollView {
                VStack(spacing: 20) {
                    // Active Notebooks Section
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Active Notebooks")
                            .font(.headline)
                            .foregroundColor(.primary)
                            .padding(.horizontal, 4)

                        GlassEffectContainer {
                            VStack(spacing: 10) {
                                ForEach(state.activeNotebooksList) { notebook in
                                    notebookRow(notebook, isArchived: false)
                                }
                            }
                        }
                    }

                    // Create New Notebook Form / Button
                    if isCreating {
                        VStack(spacing: 12) {
                            TextField("Notebook Name (max 20)", text: $newNotebookName)
                                .glassInputStyle(cornerRadius: AppTheme.radiusInput)
                                .onChange(of: newNotebookName) { _, newVal in
                                    if newVal.count > 20 { newNotebookName = String(newVal.prefix(20)) }
                                }

                            HStack(spacing: 10) {
                                Button("Cancel") {
                                    newNotebookName = ""
                                    isCreating = false
                                }
                                .buttonStyle(
                                    .liquidGlass(
                                        variant: .glass,
                                        size: .regular,
                                        cornerRadius: AppTheme.radiusButton
                                    )
                                )

                                Button("Create") {
                                    createNotebook()
                                }
                                .buttonStyle(
                                    .liquidGlass(
                                        variant: .prominent,
                                        size: .regular,
                                        cornerRadius: AppTheme.radiusButton
                                    )
                                )
                                .disabled(newNotebookName.trimmingCharacters(in: .whitespaces).isEmpty)
                                .opacity(newNotebookName.trimmingCharacters(in: .whitespaces).isEmpty ? 0.45 : 1.0)
                            }
                        }
                        .padding(14)
                        .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
                    } else {
                        Button(action: {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            isCreating = true
                        }) {
                            HStack(spacing: 8) {
                                Image(systemName: "plus.circle.fill")
                                    .font(.headline)
                                Text("New Notebook")
                                    .font(.subheadline.bold())
                            }
                            .foregroundColor(AppTheme.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .liquidGlassFlat(cornerRadius: AppTheme.radiusButton)
                        }
                        .buttonStyle(ScaleTouchStyle())
                    }

                    // Archived Notebooks Section
                    if !state.archivedNotebooksList.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Button(action: {
                                withAnimation(.spring(response: 0.28, dampingFraction: 0.72)) {
                                    showArchived.toggle()
                                }
                            }) {
                                HStack {
                                    Image(systemName: showArchived ? "archivebox.fill" : "archivebox")
                                    Text(showArchived ? "Hide Archived (\(state.archivedNotebooksList.count))" : "Show Archived (\(state.archivedNotebooksList.count))")
                                        .font(.subheadline.bold())
                                    Spacer()
                                    Image(systemName: showArchived ? "chevron.up" : "chevron.down")
                                        .font(.caption.bold())
                                }
                                .foregroundColor(.secondary)
                                .padding(.horizontal, 4)
                            }
                            .buttonStyle(ScaleTouchStyle())

                            if showArchived {
                                GlassEffectContainer {
                                    VStack(spacing: 10) {
                                        ForEach(state.archivedNotebooksList) { notebook in
                                            notebookRow(notebook, isArchived: true)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(20)
            }
            .navigationTitle("Notebooks")
            .navigationBarTitleDisplayMode(.inline)
            .liquidGlassSheet(detents: [.fraction(0.94)])
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .font(.body.bold())
                }
            }
            .alert(
                "Delete Notebook?",
                isPresented: Binding(
                    get: { deleteConfirmNotebook != nil },
                    set: { if !$0 { deleteConfirmNotebook = nil } }
                ),
                actions: {
                    Button("Cancel", role: .cancel) { deleteConfirmNotebook = nil }
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
        let isEditing = editingNotebookId == notebook.id

        // The whole card surface is tappable; action buttons are nested inside
        // and take precedence for their own taps. Disabled while renaming so
        // the text field keeps the taps.
        return Button(action: {
            if !isArchived {
                state.activeNotebookId = notebook.id
                dismiss()
            }
        }) {
            HStack(spacing: 12) {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "book.closed")
                    .font(.title3)
                    .symbolRenderingMode(.hierarchical)
                    .foregroundColor(isSelected ? AppTheme.primary : .secondary)

                VStack(alignment: .leading, spacing: 2) {
                    if isEditing {
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

                // Actions
                HStack(spacing: 6) {
                    if isEditing {
                        Button(action: { saveEdit(notebook.id) }) {
                            Image(systemName: "checkmark")
                                .font(.caption.bold())
                                .foregroundColor(AppTheme.accent)
                                .frame(width: 30, height: 30)
                                .liquidGlassPill()
                        }
                    } else {
                        Button(action: {
                            editingNotebookId = notebook.id
                            editingNotebookName = notebook.name
                        }) {
                            Image(systemName: "pencil")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(AppTheme.primary)
                                .frame(width: 30, height: 30)
                                .liquidGlassPill()
                        }
                    }

                Button(action: {
                    state.archiveNotebook(id: notebook.id, archived: !isArchived)
                }) {
                    Image(systemName: isArchived ? "tray.and.arrow.up" : "archivebox")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(AppTheme.primary)
                        .frame(width: 30, height: 30)
                        .liquidGlassPill()
                }

                Button(action: {
                    deleteConfirmNotebook = notebook
                }) {
                    Image(systemName: "trash")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(AppTheme.danger.opacity(0.85))
                        .frame(width: 30, height: 30)
                        .liquidGlassPill()
                }
                }
            }
            .padding(14)
            .contentShape(.rect)
        }
        .buttonStyle(ScaleTouchStyle())
        .disabled(isEditing)
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
