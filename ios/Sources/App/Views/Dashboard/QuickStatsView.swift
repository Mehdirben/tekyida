import SwiftUI

// MARK: - QuickStats View (Modern Apple Liquid Glass HIG)
public struct QuickStatsView: View {
    let moneyOwed: Double
    let moneyGiven: Double
    let netBalance: Double
    let isHidden: Bool
    let onTogglePrivacy: () -> Void

    public init(
        moneyOwed: Double,
        moneyGiven: Double,
        netBalance: Double,
        isHidden: Bool,
        onTogglePrivacy: @escaping () -> Void
    ) {
        self.moneyOwed = moneyOwed
        self.moneyGiven = moneyGiven
        self.netBalance = netBalance
        self.isHidden = isHidden
        self.onTogglePrivacy = onTogglePrivacy
    }

    public var body: some View {
        GlassEffectContainer {
            VStack(spacing: 12) {
                // Row 1: Side by side cards for Money Owed & Money Given
                HStack(spacing: 12) {
                    statCard(
                        title: "Money Owed",
                        amount: moneyOwed,
                        icon: "arrow.down.left",
                        color: AppTheme.accent,
                        bgColor: AppTheme.accentBg
                    )

                    statCard(
                        title: "Money Given",
                        amount: moneyGiven,
                        icon: "arrow.up.right",
                        color: AppTheme.danger,
                        bgColor: AppTheme.dangerBg
                    )
                }

                // Row 2: Full-width Net Balance Card
                HStack(spacing: 14) {
                    ZStack {
                        Circle()
                            .fill(AppTheme.primary.opacity(0.15))
                            .frame(width: 44, height: 44)

                        Image(systemName: "chart.line.uptrend.xyaxis")
                            .font(.headline)
                            .foregroundColor(AppTheme.primary)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Net Balance")
                            .font(.caption.bold())
                            .foregroundColor(.secondary)

                        AmountView(
                            amount: netBalance,
                            isHidden: isHidden,
                            font: .title3,
                            fontWeight: .bold
                        )
                    }

                    Spacer()

                    // Privacy Eye Toggle Button
                    Button(action: {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        onTogglePrivacy()
                    }) {
                        Image(systemName: isHidden ? "eye.slash.fill" : "eye.fill")
                            .font(.subheadline.bold())
                            .foregroundColor(.secondary)
                            .padding(10)
                            .background(Color.white.opacity(0.12), in: Circle())
                            .overlay {
                                Circle().stroke(Color.white.opacity(0.2), lineWidth: 1)
                            }
                    }
                    .buttonStyle(ScaleTouchStyle())
                }
                .padding(16)
                .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
            }
        }
    }

    private func statCard(
        title: String,
        amount: Double,
        icon: String,
        color: Color,
        bgColor: Color
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            ZStack {
                Circle()
                    .fill(bgColor)
                    .frame(width: 36, height: 36)

                Image(systemName: icon)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(color)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption.bold())
                    .foregroundColor(.secondary)

                AmountView(
                    amount: amount,
                    isHidden: isHidden,
                    showPlusSign: false,
                    font: .headline,
                    fontWeight: .bold,
                    customColor: color
                )
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
    }
}
