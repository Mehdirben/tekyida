import SwiftUI

// MARK: - Root Content View
struct ContentView: View {
    @ObservedObject var state: AppState
    @Environment(\.scenePhase) private var scenePhase
    @State private var selectedTab: AppTab = .dashboard

    init(state: AppState? = nil) {
        self.state = state ?? AppState()
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            // Main Content Tabs
            Group {
                switch selectedTab {
                case .dashboard:
                    DashboardView()
                case .experiences:
                    ExperiencesView()
                case .settings:
                    SettingsView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .environmentObject(state)

            // Floating Liquid Glass Navigation Bar
            FloatingTabBar(selectedTab: $selectedTab)
        }
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
