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
            .navigationTitle(tr("notebooks.title"))
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
                    ToolbarItemGroup(placement: .topBarTrailing) {
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

// MARK: - Custom Drag Reorder (Liquid Glass)
/// Press & hold a card to lift it, then drag: all other cards spring aside to
/// open the gap in real time. Fully custom styling — no system drag artifacts.
private struct NotebookReorderView: View {
    @EnvironmentObject private var state: AppState

    @Binding var activeNotebooks: [Notebook]
    @Binding var archivedNotebooks: [Notebook]
    let onPersist: () -> Void

    @State private var draggingId: String?
    @State private var dragIsArchived: Bool = false
    @State private var dragTranslation: CGFloat = 0
    @State private var hoveredIndex: Int?
    @State private var liftedId: String?
    @State private var settlingId: String?
    @State private var settleOffset: CGFloat = 0
    @State private var rowHeight: CGFloat = 0
    @State private var viewportFrame: CGRect = .zero
    @State private var autoScrollDirection: Int = 0

    private let spacing: CGFloat = 10
    private let reorderSpring: Animation = .spring(response: 0.32, dampingFraction: 0.85)
    private var slotHeight: CGFloat { rowHeight + spacing }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(spacing: 20) {
                    section(title: tr("notebooks.activeSection"), items: $activeNotebooks, isArchived: false)

                    if !archivedNotebooks.isEmpty {
                        section(title: tr("notebooks.archivedSection"), items: $archivedNotebooks, isArchived: true)
                    }
                }
                .padding(20)
            }
            .background(
                GeometryReader { geo in
                    Color.clear.preference(key: ReorderViewportFrameKey.self, value: geo.frame(in: .global))
                }
            )
            .onPreferenceChange(ReorderRowHeightKey.self) { rowHeight = max(rowHeight, $0) }
            .onPreferenceChange(ReorderViewportFrameKey.self) { viewportFrame = $0 }
            .task(id: autoScrollDirection) {
                await runAutoScroll(proxy)
            }
        }
    }

    private func section(title: String, items: Binding<[Notebook]>, isArchived: Bool) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)
                .foregroundColor(.primary)
                .padding(.horizontal, 4)

            GlassEffectContainer {
                VStack(spacing: spacing) {
                    ForEach(Array(items.wrappedValue.enumerated()), id: \.element.id) { index, notebook in
                        row(notebook, index: index, items: items, isArchived: isArchived)
                    }
                }
            }
        }
    }

    private func row(
        _ notebook: Notebook,
        index: Int,
        items: Binding<[Notebook]>,
        isArchived: Bool
    ) -> some View {
        let isDragging = draggingId == notebook.id
        let isLifted = liftedId == notebook.id

        return HStack(spacing: 12) {
            Image(systemName: "line.3.horizontal")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.secondary)

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

            Spacer()
        }
        .padding(14)
        .liquidGlassFlat(cornerRadius: AppTheme.radiusCard)
        .background(
            GeometryReader { geo in
                Color.clear.preference(key: ReorderRowHeightKey.self, value: geo.size.height)
            }
        )
        .scaleEffect(isLifted ? 1.04 : 1)
        .shadow(color: .black.opacity(isLifted ? 0.2 : 0), radius: isLifted ? 14 : 0, y: isLifted ? 6 : 0)
        .offset(y: isDragging
            ? dragTranslation
            : (settlingId == notebook.id
               ? settleOffset
               : shiftOffset(for: index, in: items.wrappedValue, isArchived: isArchived)))
        .zIndex(isDragging || settlingId == notebook.id ? 1 : 0)
        .overlay(
            LongPressDragRecognizer(
                minimumPressDuration: 0.25,
                allowableMovement: 12,
                onBegan: {
                    beginDrag(notebook, at: index, isArchived: isArchived)
                },
                onChanged: { translation, location in
                    updateDrag(translation: translation, location: location, for: notebook.id)
                },
                onEnded: {
                    endDrag(of: notebook.id, items: items)
                }
            )
        )
    }

    private func shiftOffset(for index: Int, in items: [Notebook], isArchived: Bool) -> CGFloat {
        guard let draggingId, let hoveredIndex, slotHeight > 0,
              isArchived == dragIsArchived,
              let source = items.firstIndex(where: { $0.id == draggingId }),
              source != index
        else { return 0 }

        if source < hoveredIndex {
            return (index > source && index <= hoveredIndex) ? -slotHeight : 0
        }
        if source > hoveredIndex {
            return (index >= hoveredIndex && index < source) ? slotHeight : 0
        }
        return 0
    }

    private func beginDrag(_ notebook: Notebook, at index: Int, isArchived: Bool) {
        guard draggingId == nil else { return }
        settlingId = nil
        settleOffset = 0
        withAnimation(reorderSpring) {
            liftedId = notebook.id
        }
        draggingId = notebook.id
        dragIsArchived = isArchived
        dragTranslation = 0
        hoveredIndex = index
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    private func updateDrag(translation: CGPoint, location: CGPoint, for id: String) {
        guard draggingId == id else { return }
        dragTranslation = translation.y

        let items = dragIsArchived ? archivedNotebooks : activeNotebooks
        if slotHeight > 0, let source = items.firstIndex(where: { $0.id == draggingId }) {
            let projected = source + Int((dragTranslation / slotHeight).rounded())
            let clamped = min(max(projected, 0), items.count - 1)
            if clamped != hoveredIndex {
                withAnimation(reorderSpring) {
                    hoveredIndex = clamped
                }
                UISelectionFeedbackGenerator().selectionChanged()
            }
        }

        autoScrollDirection = autoScrollDirection(forY: location.y)
    }

    private func endDrag(of id: String, items: Binding<[Notebook]>) {
        guard draggingId == id, let hoveredIndex else { return }
        autoScrollDirection = 0

        let sourceIndex = items.wrappedValue.firstIndex(where: { $0.id == id })
        let remainder: CGFloat
        if let sourceIndex, slotHeight > 0 {
            remainder = dragTranslation - CGFloat(hoveredIndex - sourceIndex) * slotHeight
        } else {
            remainder = dragTranslation
        }

        if let sourceIndex, sourceIndex != hoveredIndex {
            items.wrappedValue.move(
                fromOffsets: IndexSet(integer: sourceIndex),
                toOffset: hoveredIndex > sourceIndex ? hoveredIndex + 1 : hoveredIndex
            )
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            onPersist()
        }

        draggingId = nil
        dragTranslation = 0
        self.hoveredIndex = nil
        settlingId = id
        settleOffset = remainder

        withAnimation(reorderSpring) {
            settleOffset = 0
            liftedId = nil
        }

        Task { @MainActor in
            try? await Task.sleep(for: .seconds(0.5))
            if settlingId == id {
                settlingId = nil
                settleOffset = 0
            }
        }
    }

    private func autoScrollDirection(forY y: CGFloat) -> Int {
        guard viewportFrame != .zero else { return 0 }
        let edge: CGFloat = 72
        if y < viewportFrame.minY + edge { return -1 }
        if y > viewportFrame.maxY - edge { return 1 }
        return 0
    }

    private func runAutoScroll(_ proxy: ScrollViewProxy) async {
        guard autoScrollDirection != 0 else { return }
        let direction = autoScrollDirection
        var cursor = (hoveredIndex ?? 0) + direction

        while autoScrollDirection == direction, draggingId != nil {
            let items = dragIsArchived ? archivedNotebooks : activeNotebooks
            if cursor >= 0 && cursor < items.count {
                withAnimation(.linear(duration: 0.3)) {
                    proxy.scrollTo(items[cursor].id, anchor: direction < 0 ? .top : .bottom)
                }
            }
            cursor += direction
            try? await Task.sleep(for: .seconds(0.3))
        }
    }
}

private struct ReorderRowHeightKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = max(value, nextValue())
    }
}

private struct ReorderViewportFrameKey: PreferenceKey {
    static var defaultValue: CGRect = .zero
    static func reduce(value: inout CGRect, nextValue: () -> CGRect) {
        value = nextValue()
    }
}

// MARK: - UIKit Long-Press Drag Recognizer
/// A real UILongPressGestureRecognizer drives the reorder interaction:
/// .began fires only after a genuine hold, so a quick tap can never lift the
/// card, and .ended/.cancelled/.failed are always delivered, so the drag can
/// never get stuck. Moving before the hold completes fails the recognizer and
/// the scroll view's pan takes over instead.
private struct LongPressDragRecognizer: UIViewRepresentable {
    let minimumPressDuration: TimeInterval
    let allowableMovement: CGFloat
    let onBegan: () -> Void
    let onChanged: (_ translation: CGPoint, _ location: CGPoint) -> Void
    let onEnded: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onBegan: onBegan, onChanged: onChanged, onEnded: onEnded)
    }

    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.backgroundColor = .clear
        let recognizer = UILongPressGestureRecognizer(
            target: context.coordinator,
            action: #selector(Coordinator.handle(_:))
        )
        recognizer.minimumPressDuration = minimumPressDuration
        recognizer.allowableMovement = allowableMovement
        view.addGestureRecognizer(recognizer)
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        context.coordinator.onBegan = onBegan
        context.coordinator.onChanged = onChanged
        context.coordinator.onEnded = onEnded
    }

    final class Coordinator: NSObject {
        var onBegan: () -> Void
        var onChanged: (CGPoint, CGPoint) -> Void
        var onEnded: () -> Void
        private var initialLocation: CGPoint = .zero

        init(
            onBegan: @escaping () -> Void,
            onChanged: @escaping (CGPoint, CGPoint) -> Void,
            onEnded: @escaping () -> Void
        ) {
            self.onBegan = onBegan
            self.onChanged = onChanged
            self.onEnded = onEnded
            super.init()
        }

        @objc func handle(_ recognizer: UILongPressGestureRecognizer) {
            let location = recognizer.location(in: nil)
            switch recognizer.state {
            case .began:
                initialLocation = location
                onBegan()
            case .changed:
                let translation = CGPoint(
                    x: location.x - initialLocation.x,
                    y: location.y - initialLocation.y
                )
                onChanged(translation, location)
            case .ended, .cancelled, .failed:
                onEnded()
            default:
                break
            }
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
