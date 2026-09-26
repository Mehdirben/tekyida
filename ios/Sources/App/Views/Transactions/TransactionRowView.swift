import SwiftUI

// MARK: - Reusable Transaction Row View (Modern Liquid Glass HIG)
public struct TransactionRowView: View {
    @EnvironmentObject private var state: AppState
    let transaction: Transaction
    let isMasked: Bool
    let showsActions: Bool
    let onEdit: () -> Void
    let onDelete: () -> Void

    public init(
        transaction: Transaction,
        isMasked: Bool,
        showsActions: Bool = true,
        onEdit: @escaping () -> Void,
        onDelete: @escaping () -> Void
    ) {
        self.transaction = transaction
        self.isMasked = isMasked
        self.showsActions = showsActions
        self.onEdit = onEdit
        self.onDelete = onDelete
    }

    public var body: some View {
        HStack(spacing: 12) {
            // Direction Icon Pill
            ZStack {
                ConcentricRectangle(cornerRadius: 12)
                    .fill(transaction.amount > 0 ? AppTheme.accentBg : AppTheme.dangerBg)
                    .frame(width: 38, height: 38)

                Image(systemName: transaction.amount > 0 ? "arrow.down.left" : "arrow.up.right")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(transaction.amount > 0 ? AppTheme.accent : AppTheme.danger)
            }

            // Description & Date
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 4) {
                    Text(formattedDate(transaction.date))
                        .font(.caption2)
                        .foregroundColor(.secondary)

                    if state.isItemPendingSync(id: transaction.id) {
                        Image(systemName: "arrow.triangle.2.circlepath")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(AppTheme.warning)
                    }
                }

                if let desc = transaction.description, !desc.isEmpty {
                    Text(desc)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(2)
                }
            }

            Spacer()

            // Amount
            AmountView(
                amount: transaction.amount,
                isHidden: isMasked,
                showsCurrency: false,
                font: .subheadline,
                fontWeight: .bold
            )

            // Actions (Edit, Delete)
            if showsActions {
                RowActionButtons(
                    onEdit: onEdit,
                    onDelete: onDelete
                )
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .liquidGlassFlat(cornerRadius: AppTheme.radiusCard)
    }

    private func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}
