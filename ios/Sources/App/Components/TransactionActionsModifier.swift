import SwiftUI

// MARK: - Transaction Actions Modifier
// Owns the complete transaction CRUD surface for a detail screen: the
// "add transaction" sheet, the edit sheet, and the delete confirmation.
// Targets are parameterized so every parent (contact, experience, ...)
// gets full transaction management from a single modifier.
public struct TransactionActionsModifier: ViewModifier {
    @EnvironmentObject private var state: AppState
    @Binding var isAddingTransaction: Bool
    @Binding var editingTransaction: Transaction?
    @Binding var deletingTransaction: Transaction?
    let notebookId: String
    let contactId: String?
    let experienceId: String?

    public func body(content: Content) -> some View {
        content
            .sheet(isPresented: $isAddingTransaction) {
                AddTransactionSheet { amount, desc, date in
                    state.createTransaction(
                        notebookId: notebookId,
                        contactId: contactId,
                        experienceId: experienceId,
                        amount: amount,
                        description: desc,
                        date: date
                    )
                }
            }
            .sheet(item: $editingTransaction) { tx in
                AddTransactionSheet(transaction: tx) { amount, desc, date in
                    state.updateTransaction(id: tx.id, amount: amount, description: desc, date: date)
                }
            }
            .confirmableDelete(
                item: $deletingTransaction,
                title: tr("transaction.deleteTitle"),
                onDelete: { tx in
                    state.deleteTransaction(id: tx.id)
                }
            )
    }
}

public extension View {
    func transactionActions(
        isAdding: Binding<Bool>,
        editing: Binding<Transaction?>,
        deleting: Binding<Transaction?>,
        notebookId: String,
        contactId: String? = nil,
        experienceId: String? = nil
    ) -> some View {
        modifier(TransactionActionsModifier(
            isAddingTransaction: isAdding,
            editingTransaction: editing,
            deletingTransaction: deleting,
            notebookId: notebookId,
            contactId: contactId,
            experienceId: experienceId
        ))
    }
}
