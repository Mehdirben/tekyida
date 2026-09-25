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

            SettingsView()
                .tabItem {
                    Label(AppTab.settings.title, systemImage: AppTab.settings.icon)
                }
                .tag(AppTab.settings)
        }
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
        .animation(.easeInOut(duration: 0.25), value: state.isAppLocked)
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
