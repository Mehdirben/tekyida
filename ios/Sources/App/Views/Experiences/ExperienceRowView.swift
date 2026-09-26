import SwiftUI

// MARK: - Experience Row View (Modern Liquid Glass HIG)
public struct ExperienceRowView: View {
    @EnvironmentObject private var state: AppState
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
        // The whole card surface is tappable; action buttons are nested inside
        // and take precedence for their own taps
        Button(action: {
            onTap()
        }) {
            VStack(spacing: 10) {
                VStack(spacing: 6) {
                    // Row 1: Icon, Title & Balance
                    HStack(spacing: 12) {
                        ZStack {
                            ConcentricRectangle(cornerRadius: 14)
                                .fill(AppTheme.primary.opacity(0.14))
                                .frame(width: 42, height: 42)

                            Image(systemName: "safari.fill")
                                .font(.system(size: 17))
                                .foregroundColor(AppTheme.primary)
                        }

                        HStack(spacing: 5) {
                            Text(experience.name)
                                .font(.subheadline.bold())
                                .foregroundColor(.primary)
                                .lineLimit(1)

                            if state.isItemPendingSync(id: experience.id) {
                                Image(systemName: "arrow.triangle.2.circlepath")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(AppTheme.warning)
                            }
                        }

                        Spacer()

                        AmountView(
                            amount: balance,
                            isHidden: isMasked,
                            font: .subheadline,
                            fontWeight: .bold
                        )
                    }

                    // Row 2: Contact Chip & Transaction Count
                    HStack(spacing: 8) {
                        if let contact = contactName {
                            HStack(spacing: 4) {
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

                        Text("\(transactionCount) transaction\(transactionCount == 1 ? "" : "s")")
                            .font(.caption2)
                            .foregroundColor(.secondary)

                        Spacer()
                    }
                    .padding(.leading, 54)
                }

                Divider()

                // Action Buttons Bar
                HStack(spacing: 8) {
                    // Lock / Unlock status toggle button
                    Button(action: {
                        onToggleClosed()
                    }) {
                        HStack(spacing: 5) {
                            Image(systemName: experience.closed ? "lock.fill" : "lock.open.fill")
                                .font(.system(size: 11, weight: .bold))
                            Text(experience.closed ? "Closed" : "Open")
                                .font(.caption2.bold())
                        }
                        .foregroundColor(experience.closed ? AppTheme.warning : AppTheme.accent)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .contentShape(Capsule())
                        .liquidGlassPill()
                    }
                    .buttonStyle(ScaleTouchStyle())

                    Spacer()

                    RowActionButtons(
                        onEdit: onEdit,
                        onTransfer: onTransfer,
                        onDelete: onDelete,
                        showsChevron: true
                    )
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .contentShape(.rect)
        }
        .buttonStyle(ScaleTouchStyle())
        .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
    }
}
