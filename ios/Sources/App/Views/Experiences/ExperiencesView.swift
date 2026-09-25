import SwiftUI

// MARK: - Experiences Main View
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
                        // Open Experiences Total Balance Card
                        if let activeNb = state.activeNotebook {
                            totalBalanceCard(notebookId: activeNb.id)
                        }

                        // Filter Segmented Control
                        filterSegmentedControl

                        // Experiences List
                        experiencesList
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 24)
                }
            }
            .tekyidaNavigationBar(
                notebookName: state.activeNotebook?.name ?? "Select Notebook",
                onSelectNotebook: { showNotebookManager = true }
            )
            .navigationDestination(item: $navigatedExperience) { exp in
                ExperienceDetailView(experience: exp)
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
                Button("Cancel", role: .cancel) { deletingExperience = nil }
                Button("Delete", role: .destructive) {
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
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(AppTheme.primary.opacity(0.12))
                    .frame(width: 40, height: 40)

                Image(systemName: "safari.fill")
                    .font(.system(size: 18))
                    .foregroundColor(AppTheme.primary)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("Open Experiences Total")
                    .font(.caption2.bold())
                    .foregroundColor(.secondary)
                    .textCase(.uppercase)

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
        HStack(spacing: 6) {
            ForEach(ExperienceFilter.allCases, id: \.self) { filter in
                let isSelected = filterMode == filter
                Button(action: {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    withAnimation(.spring(response: 0.25, dampingFraction: 0.7)) {
                        filterMode = filter
                    }
                }) {
                    Text(filter.rawValue)
                        .font(.subheadline.bold())
                        .foregroundColor(isSelected ? .white : .secondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background {
                            if isSelected {
                                RoundedRectangle(cornerRadius: AppTheme.radiusInput, style: .continuous)
                                    .fill(AppTheme.primary)
                                    .shadow(color: AppTheme.primary.opacity(0.3), radius: 6, x: 0, y: 2)
                            }
                        }
                }
            }
        }
        .padding(4)
        .liquidGlassFlat(cornerRadius: AppTheme.radiusInput + 4)
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
            if filtered.isEmpty {
                GlassEmptyStateView(
                    systemImage: "safari",
                    title: "No experiences found",
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

            // Bottom Add Experience button (PWA mobile responsive placement)
            ListAddBottomButton(
                title: "Add Experience",
                systemImage: "plus",
                action: { showAddExperience = true }
            )
        }
    }
}
