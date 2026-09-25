import SwiftUI

// MARK: - App Navigation Tabs (Modern Liquid Glass HIG)
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
        // Hide the docked UIKit tab bar only where the custom floating bar is used
        #if compiler(>=6.2)
        if #available(iOS 26.0, *) {
            // Native Liquid Glass tab bar is shown
        } else {
            UITabBar.appearance().isHidden = true
        }
        #else
        UITabBar.appearance().isHidden = true
        #endif
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            tabBarRoot

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

    // MARK: - Tab Bar Root (Native Liquid Glass on iOS 26+, custom floating bar below)
    @ViewBuilder
    private var tabBarRoot: some View {
        #if compiler(>=6.2)
        if #available(iOS 26.0, *) {
            nativeLiquidGlassTabBar
        } else {
            legacyFloatingGlassTabBar
        }
        #else
        legacyFloatingGlassTabBar
        #endif
    }

    // MARK: - Native Liquid Glass Tab Bar (iOS 26+)
    // System tab bar with real Liquid Glass, dedicated search tab role
    // and minimize-on-scroll behavior.
    #if compiler(>=6.2)
    @available(iOS 26.0, *)
    private var nativeLiquidGlassTabBar: some View {
        TabView(selection: $selectedTab) {
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
        }
        .tint(AppTheme.primary)
    }
    #endif

    // MARK: - Legacy Floating Glass Tab Bar (pre-iOS 26)
    private var legacyFloatingGlassTabBar: some View {
        ZStack(alignment: .bottom) {
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

            // Topmost Liquid Glass Layer: Floating Capsule Pill + Detached Search Bubble
            FloatingLiquidGlassBar(selectedTab: $selectedTab)
                .padding(.bottom, 12)
                .zIndex(10)
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
