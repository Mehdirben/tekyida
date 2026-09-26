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
        case .dashboard: return tr("tab.dashboard")
        case .experiences: return tr("tab.experiences")
        case .settings: return tr("tab.settings")
        case .search: return tr("tab.search")
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
        Group {
            if state.isLoading {
                ZStack {
                    MeshGradientBackground()
                    ProgressView(tr("app.connecting"))
                        .tint(AppTheme.primary)
                }
            } else if state.isAuthenticated {
                nativeTabView
            } else {
                AccountAccessView()
            }
        }
        .preferredColorScheme(resolvedColorScheme)
        .environmentObject(state)
        .tint(AppTheme.primary)
        .dismissKeyboardOnTap()
        .alert(tr("app.syncError"), isPresented: Binding(
            get: { state.appError != nil },
            set: { if !$0 { state.clearAppError() } }
        )) {
            Button(tr("common.ok")) { state.clearAppError() }
        } message: {
            Text(state.appError ?? "")
        }
        .onChange(of: selectedTab) { _, _ in
            UISelectionFeedbackGenerator().selectionChanged()
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active, state.isAuthenticated {
                Task { await state.refresh() }
            }
        }
    }

    // MARK: - Native Tab Bar (all versions)
    // iOS 26+: native Liquid Glass tabs with the dedicated search role.
    // Pre-iOS 26: the classic native tab bar.
    @ViewBuilder
    private var nativeTabView: some View {
        #if compiler(>=6.2)
        if #available(iOS 26.0, *) {
            liquidGlassTabView
        } else {
            classicTabView
        }
        #else
        classicTabView
        #endif
    }

    // MARK: - Liquid Glass Tabs (iOS 26+)
    #if compiler(>=6.2)
    @available(iOS 26.0, *)
    private var liquidGlassTabView: some View {
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
            Tab(AppTab.search.title, systemImage: AppTab.search.icon, value: AppTab.search) {
                SearchView()
            }
        }
    }
    #endif

    // MARK: - Classic Native Tabs (pre-iOS 26)
    private var classicTabView: some View {
        TabView(selection: $selectedTab) {
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
