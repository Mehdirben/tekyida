import SwiftUI

// MARK: - Notebook Manager Sheet (Modern Liquid Glass HIG)
// The custom drag-reorder experience lives in `NotebookReorderView.swift`,
// the edit popup in `EditNotebookPopup.swift`, and the shared long-press drag
// recognizer in `Components/LongPressDragRecognizer.swift`.
public struct NotebookManagerSheet: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var newNotebookName: String = ""
    @State private var isCreating: Bool = false
    @State private var editingNotebook: Notebook?
    @State private var showArchived: Bool = false
    @State private var deleteConfirmNotebook: Notebook?
    @State private var isReordering: Bool = false
    @State private var reorderedNotebooks: [Notebook] = []
    @State private var reorderedArchivedNotebooks: [Notebook] = []

    public init() {}

    public var body: some View {
        NavigationStack {
            Group {
                if isReordering {
                    NotebookReorderView(
                        activeNotebooks: $reorderedNotebooks,
                        archivedNotebooks: $reorderedArchivedNotebooks,
                        onPersist: persistReorderedNotebooks
                    )
                    .transition(.opacity)
                } else {
                    managerContent
                        .transition(.opacity)
                }
            }
            .scrollDismissesKeyboard(.immediately)
            .topScrollEdgeDisabled()
            .dismissKeyboardOnTap()
            .navigationTitle(isReordering ? tr("notebook.reorder") : tr("notebooks.title"))
            .navigationBarTitleDisplayMode(.inline)
            .liquidGlassSheet(detents: [.fraction(0.94)])
            .interactiveDismissDisabled(isReordering)
            .toolbar {
                if isReordering {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button(tr("notebook.reorderDone")) {
                            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                isReordering = false
                            }
                        }
                        .font(.body.bold())
                    }
                } else {
                    ToolbarItemGroup(placement: .topBarLeading) {
                        if state.activeNotebooksList.count + state.archivedNotebooksList.count > 1 {
                            Button(tr("notebook.reorder")) {
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                reorderedNotebooks = state.activeNotebooksList
                                reorderedArchivedNotebooks = state.archivedNotebooksList
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                    isReordering = true
                                }
                            }
                        }
                    }

                    ToolbarItem(placement: .topBarTrailing) {
                        Button(tr("common.done")) {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            dismiss()
                        }
                        .font(.body.bold())
                    }
                }
            }
            .sheet(item: $editingNotebook) { notebook in
                EditNotebookPopup(notebook: notebook) { name in
                    Task { await state.updateNotebook(id: notebook.id, name: name) }
                }
            }
            .confirmableDelete(
                item: $deleteConfirmNotebook,
                title: tr("notebooks.deleteTitle"),
                message: { String(format: tr("notebooks.deleteMessage"), $0?.name ?? "") },
                onDelete: { nb in
                    Task { await state.deleteNotebook(id: nb.id) }
                }
            )
        }
    }

    private var managerContent: some View {
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
                    createForm
                } else {
                    createButton
                }

                // Archived Notebooks Section
                if !state.archivedNotebooksList.isEmpty {
                    archivedSection
                }
            }
            .padding(20)
        }
    }

    private var createForm: some View {
        VStack(spacing: 12) {
            GlassInputField(
                placeholder: tr("notebooks.namePlaceholder"),
                text: $newNotebookName,
                autocapitalization: .sentences,
                characterLimit: 20
            )

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
    }

    private var createButton: some View {
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

    private var archivedSection: some View {
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
                                PendingSyncIndicator(size: 11)
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

    private func persistReorderedNotebooks() {
        state.reorderNotebooks(orderedIds: reorderedNotebooks.map(\.id) + reorderedArchivedNotebooks.map(\.id))
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
