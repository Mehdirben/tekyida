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
        // The whole card surface is tappable; action buttons are nested inside
        // and take precedence for their own taps
        Button(action: {
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

                // Contact Info: name with amount below
                VStack(alignment: .leading, spacing: 3) {
                    Text(contact.name)
                        .font(.headline)
                        .foregroundColor(.primary)
                        .lineLimit(1)

                    AmountView(
                        amount: balance,
                        isHidden: isMasked,
                        font: .subheadline,
                        fontWeight: .semibold
                    )
                }

                Spacer()

                // Circular Glass Action Buttons
                RowActionButtons(
                    onEdit: onEdit,
                    onDelete: onDelete,
                    showsChevron: true
                )
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .contentShape(.rect)
        }
        .buttonStyle(ScaleTouchStyle())
        .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
    }
}
