import SwiftUI

// MARK: - Search Result Row
// Lightweight list row used by SearchView for contacts and experiences:
// circle icon, title with pending-sync indicator and optional badge, optional
// subtitle, and a masked-amount trailing with chevron.
public struct SearchResultRow: View {
    @EnvironmentObject private var state: AppState
    let systemImage: String
    let title: String
    let itemId: String
    let balance: Double
    let isMasked: Bool
    let onTap: () -> Void
    let subtitle: String?
    let badgeTitle: String?
    let badgeColor: Color
    let badgeBackground: Color

    public init(
        systemImage: String,
        title: String,
        itemId: String,
        balance: Double,
        isMasked: Bool,
        subtitle: String? = nil,
        badgeTitle: String? = nil,
        badgeColor: Color = AppTheme.warning,
        badgeBackground: Color = AppTheme.warningBg,
        onTap: @escaping () -> Void
    ) {
        self.systemImage = systemImage
        self.title = title
        self.itemId = itemId
        self.balance = balance
        self.isMasked = isMasked
        self.subtitle = subtitle
        self.badgeTitle = badgeTitle
        self.badgeColor = badgeColor
        self.badgeBackground = badgeBackground
        self.onTap = onTap
    }

    public var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(AppTheme.primary.opacity(0.15))
                        .frame(width: 40, height: 40)
                    Image(systemName: systemImage)
                        .foregroundColor(AppTheme.primary)
                }

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(title)
                            .font(.subheadline.bold())
                            .foregroundColor(.primary)

                        if state.isItemPendingSync(id: itemId) {
                            PendingSyncIndicator(size: 10)
                        }

                        if let badgeTitle {
                            StatusBadge(
                                title: badgeTitle,
                                color: badgeColor,
                                backgroundColor: badgeBackground
                            )
                        }
                    }

                    if let subtitle, !subtitle.isEmpty {
                        Text(subtitle)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                HStack(spacing: 8) {
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
            .padding(12)
            .contentShape(Rectangle())
            .liquidGlassFlat(cornerRadius: AppTheme.radiusCard)
        }
        .buttonStyle(ScaleTouchStyle())
    }
}
