import SwiftUI

// MARK: - Experience Detail View
public struct ExperienceDetailView: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.dismiss) private var dismiss
    let experience: Experience

    @State private var isLocalMasked: Bool = false
    @State private var isAddingTransaction: Bool = false
    @State private var editingTransaction: Transaction?
    @State private var deletingTransaction: Transaction?
    @State private var isEditingExperience: Bool = false
    @State private var isTransferringExperience: Bool = false
    @State private var isConfirmingDeleteExperience: Bool = false

    public init(experience: Experience) {
        self.experience = experience
    }

    public var body: some View {
        ZStack {
            MeshGradientBackground()

            VStack(spacing: 0) {
                ScrollView {
                    VStack(spacing: 16) {
                        headerCard

                        if experience.closed {
                            HStack(spacing: 8) {
                                Image(systemName: "lock.fill")
                                    .foregroundColor(AppTheme.warning)
                                Text("This experience is closed. Reopen it to make changes.")
                                    .font(.caption.bold())
                                    .foregroundColor(AppTheme.warning)
                            }
                            .padding(12)
                            .frame(maxWidth: .infinity)
                            .background(AppTheme.warningBg, in: RoundedRectangle(cornerRadius: AppTheme.radiusInput, style: .continuous))
                        }

                        HStack {
                            Text("Transactions")
                                .font(.caption.bold())
                                .foregroundColor(.secondary)
                                .textCase(.uppercase)
                            Spacer()
                        }
                        .padding(.horizontal, 4)

                        let txs = state.experienceTransactions(experience.id)
                        if txs.isEmpty && !isAddingTransaction {
                            GlassEmptyStateView(
                                systemImage: "doc.text.magnifyingglass",
                                title: "No transactions in this experience",
                                subtitle: "Tap the button below to add expenses or payments to this experience."
                            )
                        } else {
                            ForEach(txs) { tx in
                                TransactionRowView(
                                    transaction: tx,
                                    isMasked: isLocalMasked || state.isAmountsHidden,
                                    onEdit: { editingTransaction = tx },
                                    onDelete: { deletingTransaction = tx }
                                )
                            }
                        }
                    }
                    .padding(16)
                }

                if !experience.closed {
                    AddTransactionView(isAdding: $isAddingTransaction) { amount, desc, date in
                        state.createTransaction(
                            notebookId: experience.notebookId,
                            contactId: experience.contactId,
                            experienceId: experience.id,
                            amount: amount,
                            description: desc,
                            date: date
                        )
                    }
                    .padding(16)
                }
            }
        }
        .navigationTitle(experience.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Button(action: {
                        state.toggleExperienceClosed(id: experience.id)
                    }) {
                        Label(experience.closed ? "Reopen Experience" : "Close Experience",
                              systemImage: experience.closed ? "lock.open" : "lock")
                    }
                    Button(action: { isEditingExperience = true }) {
                        Label("Edit Experience", systemImage: "pencil")
                    }
                    Button(action: { isTransferringExperience = true }) {
                        Label("Transfer to Notebook", systemImage: "arrow.right.arrow.left")
                    }
                    Button(role: .destructive, action: { isConfirmingDeleteExperience = true }) {
                        Label("Delete Experience", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .font(.headline)
                        .symbolRenderingMode(.hierarchical)
                }
            }
        }
        .sheet(isPresented: $isEditingExperience) {
            let nbContacts = state.contacts.filter { $0.notebookId == experience.notebookId }
            AddExperienceSheet(contacts: nbContacts, experience: experience) { name, contactId in
                state.updateExperience(id: experience.id, name: name, contactId: contactId)
            }
        }
        .sheet(isPresented: $isTransferringExperience) {
            TransferExperienceSheet(experience: experience) { targetNotebookId in
                state.transferExperience(id: experience.id, to: targetNotebookId)
                dismiss()
            }
        }
        .transactionModals(
            editingTransaction: $editingTransaction,
            deletingTransaction: $deletingTransaction,
            onSave: { id, amount, desc, date in
                state.updateTransaction(id: id, amount: amount, description: desc, date: date)
            },
            onDelete: { id in
                state.deleteTransaction(id: id)
            }
        )
        .alert("Delete Experience?", isPresented: $isConfirmingDeleteExperience) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                state.deleteExperience(id: experience.id)
                dismiss()
            }
        } message: {
            Text("Deleting '\(experience.name)' will remove all of its associated transactions.")
        }
    }

    private var headerCard: some View {
        let balance = state.experienceBalance(experience.id)
        return HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(AppTheme.primary.opacity(0.15))
                    .frame(width: 52, height: 52)

                Image(systemName: "safari.fill")
                    .font(.title2)
                    .foregroundColor(AppTheme.primary)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(experience.name)
                    .font(.title3.bold())
                    .foregroundColor(.primary)

                HStack(spacing: 6) {
                    Button(action: {
                        state.toggleExperienceClosed(id: experience.id)
                    }) {
                        StatusBadge(
                            title: experience.closed ? "Closed" : "Open",
                            systemImage: experience.closed ? "lock.fill" : "lock.open.fill",
                            color: experience.closed ? AppTheme.warning : AppTheme.accent,
                            backgroundColor: experience.closed ? AppTheme.warningBg : AppTheme.accentBg
                        )
                    }

                    if let cid = experience.contactId, let c = state.contacts.first(where: { $0.id == cid }) {
                        StatusBadge(
                            title: c.name,
                            systemImage: "person.fill",
                            color: .secondary,
                            backgroundColor: Color.white.opacity(0.1)
                        )
                    }
                }

                AmountView(
                    amount: balance,
                    isHidden: isLocalMasked || state.isAmountsHidden,
                    font: .headline,
                    fontWeight: .bold
                )
            }

            Spacer()

            MaskToggleButton(isMasked: $isLocalMasked)
        }
        .padding(16)
        .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
    }
}

// MARK: - Backwards Compatibility Alias
public typealias ExperienceDetailSheet = ExperienceDetailView
