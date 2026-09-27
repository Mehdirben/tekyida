import SwiftUI

// MARK: - Custom Drag Reorder (Liquid Glass)
/// Press & hold a card to lift it, then drag: all other cards spring aside to
/// open the gap in real time. Fully custom styling — no system drag artifacts.
/// Uses the shared `LongPressDragRecognizer` from Components.
struct NotebookReorderView: View {
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
                    PendingSyncIndicator(size: 11)
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

// MARK: - Reorder Preference Keys

struct ReorderRowHeightKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = max(value, nextValue())
    }
}

struct ReorderViewportFrameKey: PreferenceKey {
    static var defaultValue: CGRect = .zero
    static func reduce(value: inout CGRect, nextValue: () -> CGRect) {
        value = nextValue()
    }
}
