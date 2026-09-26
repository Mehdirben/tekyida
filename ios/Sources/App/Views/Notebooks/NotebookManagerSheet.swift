import SwiftUI

// MARK: - Notebook Manager Sheet (Modern Liquid Glass HIG)
public struct NotebookManagerSheet: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var newNotebookName: String = ""
    @State private var isCreating: Bool = false
    @State private var editingNotebook: Notebook?
    @State private var showArchived: Bool = false
    @State private var deleteConfirmNotebook: Notebook?

    public init() {}

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Active Notebooks Section
                    VStack(alignment: .leading, spacing: 12) {
                        Text(tr("notebooks.activeSection"))
                            .font(.headline)
                            .foregroundColor(.primary)
                            .padding(.horizontal, 4)

                        GlassEffectContainer {
                            LazyVStack(spacing: 10) {
                                ForEach(state.activeNotebooksList) { notebook in
                                    notebookRow(notebook, isArchived: false)
                                }
                            }
                        }
                    }

                    // Create New Notebook Form / Button
                    if isCreating {
                        VStack(spacing: 12) {
                            TextField(tr("notebooks.namePlaceholder"), text: $newNotebookName)
                                .glassInputStyle(cornerRadius: AppTheme.radiusInput)
                                .onChange(of: newNotebookName) { _, newVal in
                                    if newVal.count > 20 { newNotebookName = String(newVal.prefix(20)) }
                                }

                            HStack(spacing: 10) {
                                Button(tr("common.cancel")) {
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

                                Button(tr("common.create")) {
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
                            isCreating = true
                        }) {
                            HStack(spacing: 8) {
                                Image(systemName: "plus.circle.fill")
                                    .font(.headline)
                                Text(tr("notebooks.new"))
                                    .font(.subheadline.bold())
                            }
                            .foregroundColor(.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .contentShape(Rectangle())
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
                                    Text(showArchived
                                         ? String(format: tr("notebooks.hideArchived"), state.archivedNotebooksList.count)
                                         : String(format: tr("notebooks.showArchived"), state.archivedNotebooksList.count))
                                        .font(.subheadline.bold())
                                    Spacer()
                                    Image(systemName: showArchived ? "chevron.up" : "chevron.down")
                                        .font(.caption.bold())
                                }
                                .foregroundColor(.secondary)
                                .padding(.horizontal, 4)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(ScaleTouchStyle())

                            if showArchived {
                                GlassEffectContainer {
                                    LazyVStack(spacing: 10) {
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
            .scrollDismissesKeyboard(.immediately)
            .dismissKeyboardOnTap()
            .navigationTitle(tr("notebooks.title"))
            .navigationBarTitleDisplayMode(.inline)
            .liquidGlassSheet(detents: [.fraction(0.94)])
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(tr("common.done")) {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        dismiss()
                    }
                    .font(.body.bold())
                }
            }
            .sheet(item: $editingNotebook) { notebook in
                EditNotebookPopup(notebook: notebook) { name in
                    Task { await state.updateNotebook(id: notebook.id, name: name) }
                }
            }
            .alert(
                tr("notebooks.deleteTitle"),
                isPresented: Binding(
                    get: { deleteConfirmNotebook != nil },
                    set: { if !$0 { deleteConfirmNotebook = nil } }
                ),
                actions: {
                    Button(tr("common.cancel"), role: .cancel) {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        deleteConfirmNotebook = nil
                    }
                    Button(tr("common.delete"), role: .destructive) {
                        UINotificationFeedbackGenerator().notificationOccurred(.warning)
                        if let nb = deleteConfirmNotebook {
                            Task { await state.deleteNotebook(id: nb.id) }
                            deleteConfirmNotebook = nil
                        }
                    }
                },
                message: {
                    Text(String(format: tr("notebooks.deleteMessage"), deleteConfirmNotebook?.name ?? ""))
                }
            )
        }
    }

    private func notebookRow(_ notebook: Notebook, isArchived: Bool) -> some View {
        let isSelected = state.activeNotebookId == notebook.id
        let balance = state.notebookBalance(notebook.id)

        return HStack(spacing: 12) {
            Button {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                state.selectNotebook(notebook.id)
                dismiss()
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: isSelected ? "checkmark.circle.fill" : "book.closed")
                        .font(.title3)
                        .symbolRenderingMode(.hierarchical)
                        .foregroundColor(isSelected ? AppTheme.primary : .secondary)

                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 4) {
                            Text(notebook.name)
                                .font(.headline)
                                .foregroundColor(.primary)

                            if state.isItemPendingSync(id: notebook.id) {
                                Image(systemName: "arrow.triangle.2.circlepath")
                                    .font(.caption2.bold())
                                    .foregroundColor(AppTheme.warning)
                            }
                        }

                        AmountView(
                            amount: balance,
                            isHidden: state.isAmountsHidden,
                            font: .caption,
                            fontWeight: .semibold
                        )
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .contentShape(.rect)
            }
            .buttonStyle(.plain)

            HStack(spacing: 6) {
                Button {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    editingNotebook = notebook
                } label: {
                    Image(systemName: "pencil")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.secondary)
                        .frame(width: 30, height: 30)
                        .contentShape(Circle())
                        .liquidGlassPill()
                }
                .buttonStyle(.plain)

                Button {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    Task { await state.archiveNotebook(id: notebook.id, archived: !isArchived) }
                } label: {
                    Image(systemName: isArchived ? "tray.and.arrow.up" : "archivebox")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.secondary)
                        .frame(width: 30, height: 30)
                        .contentShape(Circle())
                        .liquidGlassPill()
                }
                .buttonStyle(.plain)

                Button {
                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    deleteConfirmNotebook = notebook
                } label: {
                    Image(systemName: "trash")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(AppTheme.danger.opacity(0.85))
                        .frame(width: 30, height: 30)
                        .contentShape(Circle())
                        .liquidGlassPill()
                }
                .buttonStyle(.plain)
            }
        }
        .padding(14)
        .liquidGlassFlat(cornerRadius: AppTheme.radiusCard)
    }

    private func createNotebook() {
        let name = newNotebookName
        Task {
            await state.createNotebook(name: name)
            newNotebookName = ""
            isCreating = false
        }
    }
}

private struct EditNotebookPopup: View {
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
                HStack(spacing: 12) {
                    Image(systemName: "book.closed")
                        .foregroundColor(.secondary)
                        .frame(width: 20)
                    TextField(tr("notebook.nameField"), text: $name)
                        .onChange(of: name) { _, value in
                            if value.count > 20 { name = String(value.prefix(20)) }
                        }
                }
                .glassInputStyle(cornerRadius: AppTheme.radiusInput)

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
