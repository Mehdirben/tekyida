import SwiftUI

// MARK: - Navigation Tab Enum
public enum AppTab: Int, CaseIterable {
    case dashboard = 0
    case experiences = 1
    case search = 2
    case settings = 3

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
        case .dashboard: return "book.closed.fill"
        case .experiences: return "safari.fill"
        case .search: return "magnifyingglass"
        case .settings: return "gearshape.fill"
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
    }

    var body: some View {
        TabView(selection: $selectedTab) {
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
        .tabBarMinimizeBehaviorOnScroll()
        .tint(AppTheme.primary)
        .environmentObject(state)
        .preferredColorScheme(resolvedColorScheme)
        .overlay {
            if state.isAppLocked {
                AppLockView()
                    .environmentObject(state)
                    .transition(.opacity.combined(with: .scale(scale: 0.98)))
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
            return .light\
        case .dark:
            return .dark\
        }\
    }\
}\
\
#Preview {\
    ContentView()\
}\
