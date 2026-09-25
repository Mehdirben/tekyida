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
        Button(action: {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            onTap()
        }) {
            VStack(alignment: .leading, spacing: 10) {
                // Row 1: Icon, Title & Balance
                HStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(AppTheme.primary.opacity(0.15))
                            .frame(width: 40, height: 40)

                        Image(systemName: "safari.fill")
                            .font(.system(size: 16))
                            .foregroundColor(AppTheme.primary)
                    }

                    VStack(alignment: .leading, spacing: 3) {
                        Text(experience.name)
                            .font(.headline)
                            .foregroundColor(.primary)
                            .lineLimit(1)

                        HStack(spacing: 6) {
                            if let contact = contactName {
                                StatusBadge(
                                    title: contact,
                                    systemImage: "person.fill",
                                    color: .secondary,
                                    backgroundColor: Color.white.opacity(0.1)
                                )
                            }

                            StatusBadge(
                                title: experience.closed ? "Closed" : "Open",
                                systemImage: experience.closed ? "lock.fill" : "lock.open.fill",
                                color: experience.closed ? AppTheme.warning : AppTheme.accent,
                                backgroundColor: experience.closed ? AppTheme.warningBg : AppTheme.accentBg
                            )

                            Text("• \(transactionCount) txs")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }

                    Spacer()

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
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
        }
        .buttonStyle(ScaleTouchStyle())
        .contextMenu {
            Button(action: onToggleClosed) {
                Label(experience.closed ? "Reopen Experience" : "Close Experience",
                      systemImage: experience.closed ? "lock.open" : "lock")
            }
            Button(action: onEdit) {
                Label("Edit Experience", systemImage: "pencil")
            }
            Button(action: onTransfer) {
                Label("Transfer to Notebook", systemImage: "arrow.right.arrow.left")
            }
            Button(role: .destructive, action: onDelete) {
                Label("Delete Experience", systemImage: "trash")
            }
        }
    }
}
