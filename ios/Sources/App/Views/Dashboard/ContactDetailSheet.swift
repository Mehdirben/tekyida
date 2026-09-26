import SwiftUI

private enum ContactTimelineItem: Identifiable {
    case transaction(Transaction)
    case experience(Experience, balance: Double, transactionCount: Int, lastTransactionDate: Date?)

    var id: String {
        switch self {
        case let .transaction(transaction):
            return "transaction-\(transaction.id)"
        case let .experience(experience, _, _, _):
            return "experience-\(experience.id)"
        }
    }

    var sortDate: Date {
        switch self {
        case let .transaction(transaction):
            return transaction.date
        case let .experience(_, _, _, lastTransactionDate):
            return lastTransactionDate ?? .distantPast
        }
    }
}

// MARK: - Contact Detail View (Modern Liquid Glass HIG)
public struct ContactDetailView: View {
    @EnvironmentObject private var state: AppState
    let contact: Contact

    @State private var isLocalMasked: Bool? = nil
    @State private var showAddTransaction: Bool = false
    @State private var editingTransaction: Transaction?
    @State private var deletingTransaction: Transaction?
    @State private var selectedExperience: Experience?

    public init(contact: Contact) {
        self.contact = contact
    }

    private var shouldMaskAmounts: Bool {
        isLocalMasked ?? state.isAmountsHidden
    }

    private var timelineItems: [ContactTimelineItem] {
        let transactionItems = state.directTransactions(for: contact.id)
            .map(ContactTimelineItem.transaction)
        let experienceItems = state.closedExperiences(for: contact.id).map { experience in
            let transactions = state.experienceTransactions(experience.id)
            let balance = transactions.reduce(0.0) { $0 + $1.amount }
            return ContactTimelineItem.experience(
                experience,
                balance: balance,
                transactionCount: transactions.count,
                lastTransactionDate: transactions.first?.date
            )
        }

        return (transactionItems + experienceItems).sorted { $0.sortDate > $1.sortDate }
    }

    public var body: some View {
        // Transparent content so the glass sheet presentation shows through
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 16) {
                    headerCard

                    // Title-Style Section Header
                    HStack {
                        Text(tr("timeline.title"))
                            .font(.headline)
                            .foregroundColor(.primary)
                        Spacer()
                    }
                    .padding(.horizontal, 4)
                    .padding(.top, 4)

                    let activityItems = timelineItems

                    if activityItems.isEmpty {
                        GlassEmptyStateView(
                            systemImage: "tray.fill",
                            title: tr("timeline.emptyTitle"),
                            subtitle: tr("timeline.emptySubtitle")
                        )
                    } else {
                        LazyVStack(spacing: 10) {
                            ForEach(activityItems) { item in
                                switch item {
                                case let .experience(experience, balance, transactionCount, lastTransactionDate):
                                    experienceRow(
                                        experience,
                                        balance: balance,
                                        transactionCount: transactionCount,
                                        lastTransactionDate: lastTransactionDate
                                    )
                                case let .transaction(transaction):
                                    TransactionRowView(
                                        transaction: transaction,
                                        isMasked: shouldMaskAmounts,
                                        onEdit: { editingTransaction = transaction },
                                        onDelete: { deletingTransaction = transaction }
                                    )
                                }
                            }
                        }
                    }
                }
                .padding(16)
            }

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
        .sheet(isPresented: $showAddTransaction) {
            AddTransactionSheet { amount, desc, date in
                state.createTransaction(
                    notebookId: contact.notebookId,
                    contactId: contact.id,
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
        .sheet(item: $selectedExperience) { experience in
            ExperienceDetailView(experience: experience)
                .environmentObject(state)
                .liquidGlassSheet(detents: [.fraction(0.94)])
        }
    }

    private var headerCard: some View {
        let balance = state.contactBalance(contact.id)
        return HStack(spacing: 16) {
            ZStack {
                ConcentricRectangle(cornerRadius: 18)
                    .fill(AppTheme.primary.opacity(0.15))
                    .frame(width: 56, height: 56)

                Text(String(contact.name.prefix(1)).uppercased())
                    .font(.title2.bold())
                    .foregroundColor(AppTheme.primary)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(contact.name)
                    .font(.title3.bold())
                    .foregroundColor(.primary)

                if let phone = contact.phone, !phone.isEmpty {
                    Text(phone)
                        .font(.caption)
                        .foregroundColor(.secondary)
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

    private func experienceRow(
        _ experience: Experience,
        balance: Double,
        transactionCount: Int,
        lastTransactionDate: Date?
    ) -> some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            selectedExperience = experience
        } label: {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(AppTheme.primary.opacity(0.12))
                        .frame(width: 36, height: 36)

                    Image(systemName: "safari.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(AppTheme.primary)
                }

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 5) {
                        Text(experience.name)
                            .font(.subheadline.bold())
                            .foregroundColor(.primary)

                        if state.isItemPendingSync(id: experience.id) {
                            Image(systemName: "arrow.triangle.2.circlepath")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(AppTheme.warning)
                        }
                    }

                    HStack(spacing: 6) {
                        Text("\(transactionCount) \(transactionCount == 1 ? tr("common.transaction") : tr("common.transactions"))")
                            .font(.caption2)
                            .foregroundColor(.secondary)

                        if let lastTransactionDate {
                            Text(lastTransactionDate.formatted(.dateTime.day().month(.abbreviated).year()))
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }

                Spacer()

                AmountView(
                    amount: balance,
                    isHidden: shouldMaskAmounts,
                    showsCurrency: false,
                    font: .subheadline,
                    fontWeight: .bold
                )

                Image(systemName: "chevron.right")
                    .font(.caption2.bold())
                    .foregroundColor(.secondary.opacity(0.7))
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .liquidGlassFlat(cornerRadius: AppTheme.radiusButton)
            .contentShape(RoundedRectangle(cornerRadius: AppTheme.radiusButton))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Backwards Compatibility Alias
public typealias ContactDetailSheet = ContactDetailView
