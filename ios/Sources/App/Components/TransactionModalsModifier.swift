import SwiftUI

// MARK: - Transaction Sheets and Alerts Modifier
public struct TransactionModalsModifier: ViewModifier {
    @Binding var editingTransaction: Transaction?
    @Binding var deletingTransaction: Transaction?
    let onSave: (_ id: String, _ amount: Double, _ description: String?, _ date: Date) -> Void
    let onDelete: (_ id: String) -> Void

    public func body(content: Content) -> some View {
        content
            .sheet(item: $editingTransaction) { tx in
                EditTransactionSheet(transaction: tx) { amount, desc, date in
                    onSave(tx.id, amount, desc, date)
                }
            }
            .alert("Delete Transaction?", isPresented: Binding(
                get: { deletingTransaction != nil },
                set: { if !$0 { deletingTransaction = nil } }
            )) {
                Button("Cancel", role: .cancel) {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    deletingTransaction = nil
                }
                Button("Delete", role: .destructive) {
                    UINotificationFeedbackGenerator().notificationOccurred(.warning)
                    if let tx = deletingTransaction {
                        onDelete(tx.id)
                        deletingTransaction = nil
                    }
                }
            }
    }
}

public extension View {
    func transactionModals(
        editingTransaction: Binding<Transaction?>,
        deletingTransaction: Binding<Transaction?>,
        onSave: @escaping (_ id: String, _ amount: Double, _ description: String?, _ date: Date) -> Void,
        onDelete: @escaping (_ id: String) -> Void
    ) -> some View {
        modifier(TransactionModalsModifier(
            editingTransaction: editingTransaction,
            deletingTransaction: deletingTransaction,
            onSave: onSave,
            onDelete: onDelete
        ))
    }
}
