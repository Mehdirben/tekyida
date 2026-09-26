import SwiftUI

// MARK: - Contact Detail View (Modern Liquid Glass HIG)
public struct ContactDetailView: View {
    @EnvironmentObject private var state: AppState
    let contact: Contact

    @State private var isLocalMasked: Bool = false
    @State private var isAddingTransaction: Bool = false
    @State private var editingTransaction: Transaction?
    @State private var deletingTransaction: Transaction?

    public init(contact: Contact) {
        self.contact = contact
    }

    public var body: some View {
        // Transparent content so the glass sheet presentation shows through
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 16) {
                    headerCard

                    // Title-Style Section Header
                    HStack {
                        Text("Activity Timeline")
                            .font(.headline)
                            .foregroundColor(.primary)
                        Spacer()
                    }
                    .padding(.horizontal, 4)
                    .padding(.top, 4)

                    let directTxs = state.directTransactions(for: contact.id)
                    let closedExps = state.closedExperiences(for: contact.id)

                    if directTxs.isEmpty && closedExps.isEmpty && !isAddingTransaction {
                        GlassEmptyStateView(
                            systemImage: "tray.fill",
                            title: "No Transactions Yet",
                            subtitle: "Tap the button below to add your first transaction."
                        )
                    } else {
                        GlassEffectContainer {
                            VStack(spacing: 10) {
                                ForEach(closedExps) { exp in
                                    closedExperienceRow(exp)
                                }

                                ForEach(directTxs) { tx in
                                    TransactionRowView(
                                        transaction: tx,
                                        isMasked: isLocalMasked || state.isAmountsHidden,
                                        onEdit: { editingTransaction = tx },
                                        onDelete: { deletingTransaction = tx }
                                    )
                                }
                            }
                        }
                    }
                }
                .padding(16)
            }

            // Floating Liquid Glass Action Bar
            AddTransactionView(isAdding: $isAddingTransaction) { amount, desc, date in
                state.createTransaction(
                    notebookId: contact.notebookId,
                    contactId: contact.id,
                    amount: amount,
                    description: desc,
                    date: date
                )
            }
            .padding(16)
        }
        .toolbar(.hidden, for: .navigationBar)
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

    private func closedExperienceRow(_ exp: Experience) -> some View {
        let expBalance = state.experienceBalance(exp.id)
        return HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(AppTheme.warningBg)
                    .frame(width: 36, height: 36)

                Image(systemName: "lock.fill")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(AppTheme.warning)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(exp.name)
                    .font(.subheadline.bold())
                    .foregroundColor(.primary)

                Text("Closed Experience")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            Spacer()

            AmountView(
                amount: expBalance,
                isHidden: isLocalMasked || state.isAmountsHidden,
                font: .subheadline,
                fontWeight: .bold
            )
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .liquidGlassFlat(cornerRadius: AppTheme.radiusButton)
    }
}

// MARK: - Backwards Compatibility Alias
public typealias ContactDetailSheet = ContactDetailView
