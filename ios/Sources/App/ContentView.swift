import SwiftUI

// MARK: - App Navigation Tabs
public enum AppTab: Int, CaseIterable, Identifiable, Hashable, Sendable {
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
        ZStack {
            nativeTabView

            // Fullscreen App Lock Screen if configured & active
            if state.isAppLocked && state.isLockConfigured {
                AppLockView()
                    .transition(.opacity)
                    .zIndex(100)
            }
        }
        .preferredColorScheme(resolvedColorScheme)
        .environmentObject(state)
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: state.isAppLocked)
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .background {
                state.lockApp()
            }
        }
    }

    // MARK: - Native Tab Bar (all versions)
    // iOS 26+: native Liquid Glass tabs with the dedicated search role.
    // Pre-iOS 26: the classic native tab bar.
    @ViewBuilder
    private var nativeTabView: some View {
        TabView(selection: $selectedTab) {
            #if compiler(>=6.2)
            if #available(iOS 26.0, *) {
                Tab(AppTab.dashboard.title, systemImage: AppTab.dashboard.icon, value: AppTab.dashboard) {
                    DashboardView()
                }
                Tab(AppTab.experiences.title, systemImage: AppTab.experiences.icon, value: AppTab.experiences) {
                    ExperiencesView()
                }
                Tab(AppTab.settings.title, systemImage: AppTab.settings.icon, value: AppTab.settings) {
                    SettingsView()
                }
                Tab(AppTab.search.title, systemImage: AppTab.search.icon, value: AppTab.search, role: .search) {
                    SearchView()
                }
            } else {
                classicTabs
            }
            #else
            classicTabs
            #endif
        }
        .tint(AppTheme.primary)
    }

    // MARK: - Classic Native Tabs (pre-iOS 26)
    @ViewBuilder
    private var classicTabs: some View {
        DashboardView()
            .tabItem { Label(AppTab.dashboard.title, systemImage: AppTab.dashboard.icon) }
            .tag(AppTab.dashboard)

        ExperiencesView()
            .tabItem { Label(AppTab.experiences.title, systemImage: AppTab.experiences.icon) }
            .tag(AppTab.experiences)

        SettingsView()
            .tabItem { Label(AppTab.settings.title, systemImage: AppTab.settings.icon) }
            .tag(AppTab.settings)

        SearchView()
            .tabItem { Label(AppTab.search.title, systemImage: AppTab.search.icon) }
            .tag(AppTab.search)
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
