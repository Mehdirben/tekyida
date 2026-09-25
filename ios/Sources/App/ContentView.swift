import SwiftUI

// MARK: - App Navigation Tabs (Modern Liquid Glass HIG)
public enum AppTab: Int, CaseIterable, Identifiable {
    case dashboard = 0
    case experiences = 1
    case search = 2
    case settings = 3

    public var id: Int { rawValue }

    public var title: String {
        switch self {
        case .dashboard: return "Dashboard"
        case .experiences: return "Experiences"
        case .search: return "Search"
        case .settings: return "Settings"
        }
    }

    public var icon: String {
        switch self {
        case .dashboard: return "person.2.crop.square.stack"
        case .experiences: return "safari"
        case .search: return "magnifyingglass"
        case .settings: return "gearshape"
        }
    }
}

// MARK: - Root Content View
struct ContentView: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ZStack {
            // Liquid Glass Multi-Tab Structure
            TabView(selection: $state.selectedTab) {
                DashboardView()
                    .tabItem {
                        Label(AppTab.dashboard.title, systemImage: AppTab.dashboard.icon)
                    }
                    .tag(AppTab.dashboard)

                ExperiencesView()
                    .tabItem {
                        Label(AppTab.experiences.title, systemImage: AppTab.experiences.icon)
                    }
                    .tag(AppTab.experiences)

                SearchView()
                    .tabItem {
                        Label(AppTab.search.title, systemImage: AppTab.search.icon)
                    }
                    .tag(AppTab.search)

                SettingsView()
                    .tabItem {
                        Label(AppTab.settings.title, systemImage: AppTab.settings.icon)
                    }
                    .tag(AppTab.settings)
            }
            .tint(AppTheme.primary)
            .tabBarMinimizeBehaviorOnScroll()
            .preferredColorScheme(resolvedColorScheme)

            // Fullscreen App Lock Screen if configured & active
            if state.isAppLocked && state.isLockConfigured {
                AppLockView()
                    .transition(.opacity)
                    .zIndex(100)
            }
        }
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
