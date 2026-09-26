import SwiftUI

// MARK: - Tekyida Main App Entry Point
@main
struct TekyidaApp: App {
    @StateObject private var state = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView(state: state)
                .environmentObject(state)
        }
    }
}
