import SwiftUI

// MARK: - Contact Row View
public struct ContactRowView: View {
    let contact: Contact
    let balance: Double
    let isMasked: Bool
    let onTap: () -> Void
    let onEdit: () -> Void
    let onDelete: () -> Void

    public init(
        contact: Contact,
        balance: Double,
        isMasked: Bool,
        onTap: @escaping () -> Void,
        onEdit: @escaping () -> Void,
        onDelete: @escaping () -> Void
    ) {
        self.contact = contact
        self.balance = balance
        self.isMasked = isMasked
        self.onTap = onTap
        self.onEdit = onEdit
        self.onDelete = onDelete
    }

    public var body: some View {
        Button(action: {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            onTap()
        }) {
            HStack(spacing: 12) {
                // Initials Circle
                ZStack {
                    Circle()
                        .fill(AppTheme.primary.opacity(0.15))
                        .frame(width: 42, height: 42)

                    Text(initials(contact.name))
                        .font(.subheadline.bold())
                        .foregroundColor(AppTheme.primary)
                }

                // Name & Phone
                VStack(alignment: .leading, spacing: 3) {
                    Text(contact.name)
                        .font(.headline)
                        .foregroundColor(.primary)
                        .lineLimit(1)

                    if let phone = contact.phone, !phone.isEmpty {
                        Text(phone)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                // Balance
                AmountView(
                    amount: balance,
                    isHidden: isMasked,
                    font: .subheadline,
                    fontWeight: .bold
                )

                Image(systemName: "chevron.right")
                    .font(.caption2.bold())
                    .foregroundColor(.secondary.opacity(0.6))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
        }
        .buttonStyle(ScaleTouchStyle())
        .contextMenu {
            Button(action: onEdit) {
                Label("Edit Contact", systemImage: "pencil")
            }
            Button(role: .destructive, action: onDelete) {
                Label("Delete Contact", systemImage: "trash")
            }
        }
    }

    private func initials(_ name: String) -> String {
        let parts = name.split(separator: " ").prefix(2)
        if parts.isEmpty { return "?" }
        return parts.compactMap { $0.first.map(String.init) }.joined().uppercased()
    }
}
