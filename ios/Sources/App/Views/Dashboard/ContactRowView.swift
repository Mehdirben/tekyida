import SwiftUI

// MARK: - Contact Row View (Modern Liquid Glass HIG)
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
                    // Concentric Squircle User Icon
                    ZStack {
                        ConcentricRectangle(cornerRadius: 14)
                            .fill(AppTheme.primary.opacity(0.14))
                            .frame(width: 42, height: 42)

                        Image(systemName: "person.fill")
                            .font(.system(size: 16))
                            .foregroundColor(AppTheme.primary)
                    }

                    // Contact Info
                    VStack(alignment: .leading, spacing: 2) {
                        Text(contact.name)
                            .font(.headline)
                            .foregroundColor(.primary)
                            .lineLimit(1)

                        if let phone = contact.phone, !phone.isEmpty {
                            Text(phone)
                                .font(.caption2)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }
                    }

                    Spacer()

                    // Amount
                    AmountView(
                        amount: balance,
                        isHidden: isMasked,
                        font: .subheadline,
                        fontWeight: .bold
                    )
                }
            }
            .buttonStyle(ScaleTouchStyle())

            // Circular Glass Action Buttons
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

                Button(action: {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    onTap()
                }) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.secondary.opacity(0.55))
                        .frame(width: 24, height: 30)
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
    }
}
