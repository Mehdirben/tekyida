import SwiftUI

// MARK: - Experience Row View
public struct ExperienceRowView: View {
    let experience: Experience
    let contactName: String?
    let balance: Double
    let transactionCount: Int
    let isMasked: Bool
    let onTap: () -> Void
    let onToggleClosed: () -> Void
    let onEdit: () -> Void
    let onTransfer: () -> Void
    let onDelete: () -> Void

    public init(
        experience: Experience,
        contactName: String?,
        balance: Double,
        transactionCount: Int,
        isMasked: Bool,
        onTap: @escaping () -> Void,
        onToggleClosed: @escaping () -> Void,
        onEdit: @escaping () -> Void,
        onTransfer: @escaping () -> Void,
        onDelete: @escaping () -> Void
    ) {
        self.experience = experience
        self.contactName = contactName
        self.balance = balance
        self.transactionCount = transactionCount
        self.isMasked = isMasked
        self.onTap = onTap
        self.onToggleClosed = onToggleClosed
        self.onEdit = onEdit
        self.onTransfer = onTransfer
        self.onDelete = onDelete
    }

    public var body: some View {
        VStack(spacing: 8) {
            // Main Tappable Info Area
            Button(action: {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                onTap()
            }) {
                VStack(spacing: 6) {
                    // Row 1: Icon, Title & Balance
                    HStack(spacing: 10) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(AppTheme.primary.opacity(0.12))
                                .frame(width: 38, height: 38)

                            Image(systemName: "safari.fill")
                                .font(.system(size: 16))
                                .foregroundColor(AppTheme.primary)
                        }

                        Text(experience.name)
                            .font(.subheadline.bold())
                            .foregroundColor(.primary)
                            .lineLimit(1)

                        Spacer()

                        AmountView(
                            amount: balance,
                            isHidden: isMasked,
                            font: .subheadline,
                            fontWeight: .bold
                        )
                    }

                    // Row 2: Contact Chip & Transaction Count
                    HStack(spacing: 6) {
                        if let contact = contactName {
                            HStack(spacing: 3) {
                                Image(systemName: "person.fill")
                                    .font(.system(size: 9))
                                Text(contact)
                                    .font(.caption2)
                            }
                            .foregroundColor(.secondary)

                            Text("•")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }

                        Text("\(transactionCount) transactions")
                            .font(.caption2)
                            .foregroundColor(.secondary)

                        Spacer()
                    }
                    .padding(.leading, 48)
                }
            }
            .buttonStyle(ScaleTouchStyle())

            Divider().background(Color.white.opacity(0.08))

            // Action Buttons Bar
            HStack(spacing: 8) {
                // Lock / Unlock status toggle button
                Button(action: {
                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    onToggleClosed()
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: experience.closed ? "lock.fill" : "lock.open.fill")
                            .font(.system(size: 11, weight: .semibold))
                        Text(experience.closed ? "Closed" : "Open")
                            .font(.caption2.bold())
                    }
                    .foregroundColor(experience.closed ? AppTheme.warning : AppTheme.accent)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        (experience.closed ? AppTheme.warning : AppTheme.accent).opacity(0.12),
                        in: Capsule()
                    )
                }

                Spacer()

                Button(action: {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    onEdit()
                }) {
                    Image(systemName: "pencil")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                        .padding(6)
                }

                Button(action: {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    onTransfer()
                }) {
                    Image(systemName: "arrow.right.arrow.left")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                        .padding(6)
                }

                Button(action: {
                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    onDelete()
                }) {
                    Image(systemName: "trash")
                        .font(.system(size: 12))
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
                        .padding(6)
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
    }
}
