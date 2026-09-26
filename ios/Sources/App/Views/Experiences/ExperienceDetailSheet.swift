import SwiftUI

// MARK: - Experience Detail View (Modern Liquid Glass HIG)
public struct ExperienceDetailView: View {
    @EnvironmentObject private var state: AppState
    let experience: Experience

    @State private var isLocalMasked: Bool? = nil
    @State private var showAddTransaction: Bool = false
    @State private var editingTransaction: Transaction?
    @State private var deletingTransaction: Transaction?

    public init(experience: Experience) {
        self.experience = experience
    }

    private var shouldMaskAmounts: Bool {
        isLocalMasked ?? state.isAmountsHidden
    }

    private var isClosed: Bool {
        state.experiences.first(where: { $0.id == experience.id })?.closed ?? experience.closed
    }

    public var body: some View {
        // Transparent content so the glass sheet presentation shows through
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 16) {
                    headerCard

                    if isClosed {
                        HStack(spacing: 8) {
                            Image(systemName: "lock.fill")
                                .foregroundColor(AppTheme.warning)
                            Text(tr("experience.closedNotice"))
                                .font(.caption.bold())
                                .foregroundColor(AppTheme.warning)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 10)
                        .frame(maxWidth: .infinity)
                        .background(AppTheme.warningBg, in: ConcentricRectangle(cornerRadius: AppTheme.radiusInput))
                        .overlay {
                            ConcentricRectangle(cornerRadius: AppTheme.radiusInput)
                                .stroke(AppTheme.warning.opacity(0.3), lineWidth: 1)
                        }
                    }

                    // Title-Style Section Header
                    HStack {
                        Text(tr("experience.transactionsTitle"))
                            .font(.headline)
                            .foregroundColor(.primary)
                        Spacer()
                    }
                    .padding(.horizontal, 4)
                    .padding(.top, 4)

                    let txs = state.experienceTransactions(experience.id)
                    if txs.isEmpty {
                        GlassEmptyStateView(
                            systemImage: "doc.text.magnifyingglass",
                            title: tr("experience.emptyTitle"),
                            subtitle: tr("experience.emptySubtitle")
                        )
                    } else {
                        LazyVStack(spacing: 10) {
                            ForEach(txs) { tx in
                                TransactionRowView(
                                    transaction: tx,
                                    isMasked: shouldMaskAmounts,
                                    showsActions: !isClosed,
                                    onEdit: { editingTransaction = tx },
                                    onDelete: { deletingTransaction = tx }
                                )
                            }
                        }
                    }
                }
                .padding(16)
            }

            if !isClosed {
                // Floating Liquid Glass Action Bar
                GlassButton(
                    tr("transaction.add"),
                    systemImage: "plus.circle.fill",
                    style: .primary,
                    size: .large
                ) {
                    showAddTransaction = true
                }
                .padding(16)
            }
        }
        .sheet(isPresented: $showAddTransaction) {
            AddTransactionSheet { amount, desc, date in
                state.createTransaction(
                    notebookId: experience.notebookId,
                    contactId: experience.contactId,
                    experienceId: experience.id,
                    amount: amount,
                    description: desc,
                    date: date
                )
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
    }

    private var headerCard: some View {
        let balance = state.experienceBalance(experience.id)
        return HStack(spacing: 16) {
            ZStack {
                ConcentricRectangle(cornerRadius: 18)
                    .fill(AppTheme.primary.opacity(0.15))
                    .frame(width: 56, height: 56)

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
                        UIImpactFeedbackGenerator(style: isClosed ? .light : .medium).impactOccurred()
                        state.toggleExperienceClosed(id: experience.id)
                    }) {
                        StatusBadge(
                            title: isClosed ? tr("experience.statusClosed") : tr("experience.statusOpen"),
                            systemImage: isClosed ? "lock.fill" : "lock.open.fill",
                            color: isClosed ? AppTheme.warning : AppTheme.accent,
                            backgroundColor: isClosed ? AppTheme.warningBg : AppTheme.accentBg
                        )
                    }

                    if let cid = experience.contactId, let c = state.contacts.first(where: { $0.id == cid }) {
                        StatusBadge(
                            title: c.name,
                            systemImage: "person.fill",
                            color: .secondary,
                            backgroundColor: Color(uiColor: .secondarySystemFill)
                        )
                    }
                }

                AmountView(
                    amount: balance,
                    isHidden: shouldMaskAmounts,
                    font: .headline,
                    fontWeight: .bold
                )
            }

            Spacer()

            MaskToggleButton(isMasked: Binding(
                get: { shouldMaskAmounts },
                set: { isLocalMasked = $0 }
            ))
        }
        .padding(16)
        .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
    }
}

// MARK: - Backwards Compatibility Alias
public typealias ExperienceDetailSheet = ExperienceDetailView
