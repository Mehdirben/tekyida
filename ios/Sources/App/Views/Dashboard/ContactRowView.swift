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
        HStack(spacing: 12) {
            // Main tappable area
            Button(action: {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                onTap()
            }) {
                HStack(spacing: 12) {
                    // Squircle User Icon
                    ZStack {
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(AppTheme.primary.opacity(0.12))
                            .frame(width: 38, height: 38)

                        Image(systemName: "person.fill")
                            .font(.system(size: 15))
                            .foregroundColor(AppTheme.primary)
                    }

                    // Name, Phone & Inline Balance
                    VStack(alignment: .leading, spacing: 3) {
                        Text(contact.name)
                            .font(.subheadline.bold())
                            .foregroundColor(.primary)
                            .lineLimit(1)

                        HStack(spacing: 6) {
                            if let phone = contact.phone, !phone.isEmpty {
                                HStack(spacing: 3) {
                                    Image(systemName: "phone.fill")
                                        .font(.system(size: 9))
                                    Text(phone)
                                        .font(.caption2)
                                }
                                .foregroundColor(.secondary)
                            }

                            AmountView(
                                amount: balance,
                                isHidden: isMasked,
                                font: .caption2,
                                fontWeight: .bold
                            )
                        }
                    }

                    Spacer()
                }
            }
            .buttonStyle(ScaleTouchStyle())

            // Right Actions: Edit, Delete, Chevron
            HStack(spacing: 4) {
                Button(action: {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    onEdit()
                }) {
                    Image(systemName: "pencil")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.secondary)
                        .padding(6)
                }

                Button(action: {
                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    onDelete()
                }) {
                    Image(systemName: "trash")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(AppTheme.danger.opacity(0.8))
                        .padding(6)
                }

                Button(action: {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    onTap()
                }) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.secondary.opacity(0.6))
                        .padding(.vertical, 6)
                        .padding(.leading, 2)
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
    }
}
