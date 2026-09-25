import SwiftUI

// MARK: - Reusable Transaction Row View (Modern Liquid Glass HIG)
public struct TransactionRowView: View {
    let transaction: Transaction
    let isMasked: Bool
    let onEdit: () -> Void
    let onDelete: () -> Void

    public init(
        transaction: Transaction,
        isMasked: Bool,
        onEdit: @escaping () -> Void,
        onDelete: @escaping () -> Void
    ) {
        self.transaction = transaction
        self.isMasked = isMasked
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
                Text(formattedDate(transaction.date))
                    .font(.caption2)
                    .foregroundColor(.secondary)

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
                font: .subheadline,
                fontWeight: .bold
            )

            // Actions (Edit, Delete)
            HStack(spacing: 6) {
                Button(action: {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    onEdit()
                }) {
                    Image(systemName: "pencil")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.secondary)
                        .frame(width: 30, height: 30)
                        .background(Color.white.opacity(0.08), in: Circle())
                }

                Button(action: {
                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    onDelete()
                }) {
                    Image(systemName: "trash")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(AppTheme.danger.opacity(0.85))
                        .frame(width: 30, height: 30)
                        .background(AppTheme.danger.opacity(0.12), in: Circle())
                }
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
