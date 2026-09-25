import SwiftUI

// MARK: - Navigation Tab Enum
public enum AppTab: Int, CaseIterable {
    case dashboard = 0
    case experiences = 1
    case settings = 2

    public var title: String {
        switch self {
        case .dashboard: return "Dashboard"
        case .experiences: return "Experiences"
        case .settings: return "Settings"
        }
    }

    public var icon: String {
        switch self {
        case .dashboard: return "book.closed.fill"
        case .experiences: return "safari.fill"
        case .settings: return "gearshape.fill"
        }
    }
}

// MARK: - Floating Liquid Glass Tab Bar
public struct FloatingTabBar: View {
    @Binding var selectedTab: AppTab
    @Environment(\.colorScheme) private var colorScheme

    public init(selectedTab: Binding<AppTab>) {
        self._selectedTab = selectedTab
    }

    public var body: some View {
        HStack(spacing: 8) {
            ForEach(AppTab.allCases, id: \.self) { tab in
                let isSelected = selectedTab == tab
                Button(action: {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        selectedTab = tab
                    }
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 16, weight: isSelected ? .bold : .medium))

                        if isSelected {
                            Text(tab.title)
                                .font(.system(size: 13, weight: .semibold))
                                .transition(.opacity.combined(with: .move(edge: .leading)))
                        }
                    }
                    .foregroundColor(isSelected ? .white : .secondary)
                    .padding(.horizontal, isSelected ? 16 : 14)
                    .padding(.vertical, 10)
                    .background {
                        if isSelected {
                            Capsule()
                                .fill(AppTheme.primary)
                                .shadow(color: AppTheme.primary.opacity(0.35), radius: 8, x: 0, y: 3)
                        }
                    }
                }
                .buttonStyle(ScaleTouchStyle())
            }
        }
        .padding(6)
        .background {
            Capsule()
                .fill(Color.glassBackground(for: colorScheme))
                .background(.ultraThinMaterial, in: Capsule())
        }
        .overlay {
            Capsule()
                .stroke(Color.glassBorder(for: colorScheme), lineWidth: 1)
        }
        .shadow(color: Color.black.opacity(0.12), radius: 20, x: 0, y: 8)
        .padding(.horizontal, 24)
        .padding(.bottom, 8)
    }
}
