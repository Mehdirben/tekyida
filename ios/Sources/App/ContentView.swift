import SwiftUI

// MARK: - App Navigation Tabs (Modern Liquid Glass HIG)
public enum AppTab: Int, CaseIterable, Identifiable, Sendable {
    case dashboard = 0
    case experiences = 1
    case settings = 2
    case search = 3

    public var id: Int { rawValue }

    public var title: String {
        switch self {
        case .dashboard: return "Dashboard"
        case .experiences: return "Experiences"
        case .settings: return "Settings"
        case .search: return "Search"
        }
    }

    public var icon: String {
        switch self {
        case .dashboard: return "house"
        case .experiences: return "safari"
        case .settings: return "gearshape"
        case .search: return "magnifyingglass"
        }
    }

    public var activeIcon: String {
        switch self {
        case .dashboard: return "house.fill"
        case .experiences: return "safari.fill"
        case .settings: return "gearshape.fill"
        case .search: return "magnifyingglass"
        }
    }
}

// MARK: - Root Content View
struct ContentView: View {
    @ObservedObject var state: AppState
    @Environment(\.scenePhase) private var scenePhase
    @State private var selectedTab: AppTab = .dashboard

    init(state: AppState? = nil) {
        self.state = state ?? AppState()
        // Ensure legacy rectangular docked tab bar is hidden in favor of topmost Liquid Glass layer
        UITabBar.appearance().isHidden = true
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            // Liquid Glass Multi-Tab Structure
            TabView(selection: $selectedTab) {
                DashboardView()
                    .tag(AppTab.dashboard)

                ExperiencesView()
                    .tag(AppTab.experiences)

                SettingsView()
                    .tag(AppTab.settings)

                SearchView()
                    .tag(AppTab.search)
            }
            .toolbar(.hidden, for: .tabBar)
            .tint(AppTheme.primary)
            .preferredColorScheme(resolvedColorScheme)

            // Topmost Liquid Glass Layer: Floating Capsule Pill + Detached Search Bubble
            FloatingLiquidGlassBar(selectedTab: $selectedTab)
                .padding(.bottom, 12)
                .zIndex(10)

            // Fullscreen App Lock Screen if configured & active
            if state.isAppLocked && state.isLockConfigured {
                AppLockView()
                    .transition(.opacity)
                    .zIndex(100)
            }
        }
        .environmentObject(state)
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: state.isAppLocked)
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .background {
                state.lockApp()
            }
        }
    }

    private var resolvedColorScheme: ColorScheme? {
        switch state.themeMode {
        case .system:
            return nil
        case .light:
            return .light
        case .dark:
            return .dark
        }
    }
}

#Preview {
    ContentView()
}
