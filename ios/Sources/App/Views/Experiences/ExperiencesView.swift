import SwiftUI

// MARK: - Experiences Main View (Modern Liquid Glass HIG)
public struct ExperiencesView: View {
    @EnvironmentObject private var state: AppState

    @State private var filterMode: ExperienceFilter = .all
    @State private var showNotebookManager: Bool = false
    @State private var showAddExperience: Bool = false
    @State private var navigatedExperience: Experience?
    @State private var editingExperience: Experience?
    @State private var transferringExperience: Experience?
    @State private var deletingExperience: Experience?

    public enum ExperienceFilter: String, CaseIterable {
        case all = "All"
        case active = "Active"
        case closed = "Closed"
    }

    public init() {}

    public var body: some View {
        NavigationStack {
            ZStack {
                MeshGradientBackground()

                ScrollView {
                    VStack(spacing: 20) {
                        TekyidaScrollHeader(
                            notebooks: state.activeNotebooksList,
                            activeNotebookId: Binding(
                                get: { state.activeNotebookId },
                                set: { id in if let id { state.selectNotebook(id) } else { state.activeNotebookId = nil } }
                            ),
                            onManageNotebooks: { showNotebookManager = true }
                        )

                        // Open Experiences Total Balance Card
                        if let activeNb = state.activeNotebook {
                            totalBalanceCard(notebookId: activeNb.id)
                        }

                        // Modern Liquid Glass Filter Segmented Control
                        filterSegmentedControl

                        // Experiences List
                        experiencesList
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 96)
                }
                .tabBarMinimizeBehaviorOnScroll()
            }
            .toolbar(.hidden, for: .navigationBar)
            .sheet(item: $navigatedExperience) { exp in
                ExperienceDetailView(experience: exp)
                    .environmentObject(state)
                    .liquidGlassSheet(detents: [.fraction(0.94)])
            }
            .sheet(isPresented: $showNotebookManager) {
                NotebookManagerSheet()
            }
            .sheet(isPresented: $showAddExperience) {
                if let activeNb = state.activeNotebook {
                    let nbContacts = state.contacts.filter { $0.notebookId == activeNb.id }
                    AddExperienceSheet(contacts: nbContacts) { name, contactId in
                        state.createExperience(notebookId: activeNb.id, name: name, contactId: contactId)
                    }
                }
            }
            .sheet(item: $editingExperience) { exp in
                let nbContacts = state.contacts.filter { $0.notebookId == exp.notebookId }
                AddExperienceSheet(contacts: nbContacts, experience: exp) { name, contactId in
                    state.updateExperience(id: exp.id, name: name, contactId: contactId)
                }
            }
            .sheet(item: $transferringExperience) { exp in
                TransferExperienceSheet(experience: exp) { targetNotebookId in
                    state.transferExperience(id: exp.id, to: targetNotebookId)
                }
            }
            .alert("Delete Experience?", isPresented: Binding(
                get: { deletingExperience != nil },
                set: { if !$0 { deletingExperience = nil } }
            )) {
                Button("Cancel", role: .cancel) {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    deletingExperience = nil
                }
                Button("Delete", role: .destructive) {
                    UINotificationFeedbackGenerator().notificationOccurred(.warning)
                    if let exp = deletingExperience {
                        state.deleteExperience(id: exp.id)
                        deletingExperience = nil
                    }
                }
            } message: {
                Text("Deleting '\(deletingExperience?.name ?? "")' will remove all its transactions.")
            }
        }
    }

    private func totalBalanceCard(notebookId: String) -> some View {
        let total = state.totalExperiencesBalance(for: notebookId)
        return HStack(spacing: 14) {
            ZStack {
                ConcentricRectangle(cornerRadius: 14)
                    .fill(AppTheme.primary.opacity(0.14))
                    .frame(width: 44, height: 44)

                Image(systemName: "safari.fill")
                    .font(.system(size: 20))
                    .foregroundColor(AppTheme.primary)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("Open Experiences Total")
                    .font(.caption.bold())
                    .foregroundColor(.secondary)

                AmountView(
                    amount: total,
                    isHidden: state.isAmountsHidden,
                    font: .title3,
                    fontWeight: .bold
                )
            }

            Spacer()

            MaskToggleButton(isMasked: $state.isAmountsHidden)
        }
        .padding(16)
        .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
    }

    private var filterSegmentedControl: some View {
        Picker("Filter", selection: Binding(
            get: { filterMode },
            set: { newValue in
                UISelectionFeedbackGenerator().selectionChanged()
                filterMode = newValue
            }
        )) {
            ForEach(ExperienceFilter.allCases, id: \.self) { filter in
                Text(filter.rawValue).tag(filter)
            }
        }
        .pickerStyle(.segmented)
    }

    private var experiencesList: some View {
        let activeId = state.activeNotebook?.id ?? ""
        let notebookExperiences = state.experiences.filter { $0.notebookId == activeId }

        let filtered = notebookExperiences.filter { exp in
            switch filterMode {
            case .all: return true
            case .active: return !exp.closed
            case .closed: return exp.closed
            }
        }
        .sorted { $0.createdAt > $1.createdAt }

        return VStack(spacing: 12) {
            // Title-Style Section Header
            HStack {
                Text("Experiences")
                    .font(.title3.bold())
                    .foregroundColor(.primary)

                Spacer()

                if !filtered.isEmpty {
                    Text("\(filtered.count)")
                        .font(.caption.bold())
                        .foregroundColor(.secondary)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 4)
                        .background(Color(uiColor: .secondarySystemFill), in: Capsule())
                }
            }
            .padding(.horizontal, 4)
            .padding(.top, 4)

            if filtered.isEmpty {
                GlassEmptyStateView(
                    systemImage: "safari",
                    title: "No Experiences Found",
                    subtitle: "Group expenses and split bills with friends using experiences."
                )
            } else {
                ForEach(filtered) { exp in
                    let cName = exp.contactId.flatMap { cid in state.contacts.first(where: { $0.id == cid })?.name }
                    let txCount = state.experienceTransactions(exp.id).count

                    ExperienceRowView(
                        experience: exp,
                        contactName: cName,
                        balance: state.experienceBalance(exp.id),
                        transactionCount: txCount,
                        isMasked: state.isAmountsHidden,
                        onTap: {
                            navigatedExperience = exp
                        },
                        onToggleClosed: {
                            state.toggleExperienceClosed(id: exp.id)
                        },
                        onEdit: {
                            editingExperience = exp
                        },
                        onTransfer: {
                            transferringExperience = exp
                        },
                        onDelete: {
                            deletingExperience = exp
                        }
                    )
                }
            }

            // Bottom Add Experience button
            ListAddBottomButton(
                title: "Add Experience",
                systemImage: "plus",
                action: { showAddExperience = true }
            )
            .padding(.top, 4)
        }
    }
}
