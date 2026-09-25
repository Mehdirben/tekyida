import SwiftUI

// MARK: - Contact Detail Sheet
public struct ContactDetailSheet: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.dismiss) private var dismiss
    let contact: Contact

    @State private var isLocalMasked: Bool = false
    @State private var isAddingTransaction: Bool = false
    @State private var editingTransaction: Transaction?
    @State private var deletingTransaction: Transaction?
    @State private var isEditingContact: Bool = false
    @State private var isConfirmingDeleteContact: Bool = false

    public init(contact: Contact) {
        self.contact = contact
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                MeshGradientBackground()

                VStack(spacing: 0) {
                    ScrollView {
                        VStack(spacing: 16) {
                            headerCard

                            HStack {
                                Text("Activity Timeline")
                                    .font(.caption.bold())
                                    .foregroundColor(.secondary)
                                    .textCase(.uppercase)
                                Spacer()
                            }
                            .padding(.horizontal, 4)

                            let directTxs = state.directTransactions(for: contact.id)
                            let closedExps = state.closedExperiences(for: contact.id)

                            if directTxs.isEmpty && closedExps.isEmpty && !isAddingTransaction {
                                GlassEmptyStateView(
                                    systemImage: "tray.fill",
                                    title: "No transactions yet",
                                    subtitle: "Tap the button below to add your first transaction."
                                )
                            } else {
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
                        .padding(16)
                    }

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
            }
            .navigationTitle(contact.name)
            .navigationBarTitleDisplayMode(.inline)
            .liquidGlassSheet(detents: [.large])
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                        .font(.body.bold())
                }

                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Button(action: { isEditingContact = true }) {
                            Label("Edit Contact", systemImage: "pencil")
                        }
                        Button(role: .destructive, action: { isConfirmingDeleteContact = true }) {
                            Label("Delete Contact", systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .font(.headline)
                            .symbolRenderingMode(.hierarchical)
                    }
                }
            }
            .sheet(isPresented: $isEditingContact) {
                AddContactSheet(contact: contact) { newName, newPhone in
                    state.updateContact(id: contact.id, name: newName, phone: newPhone)
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
            .alert("Delete Contact?", isPresented: $isConfirmingDeleteContact) {
                Button("Cancel", role: .cancel) {}
                Button("Delete", role: .destructive) {
                    state.deleteContact(id: contact.id)
                    dismiss()
                }
            } message: {
                Text("Deleting this contact will remove all direct transactions and unlink any associated experiences.")
            }
        }
    }

    private var headerCard: some View {
        let balance = state.contactBalance(contact.id)
        return HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(AppTheme.primary.opacity(0.15))
                    .frame(width: 52, height: 52)

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
