import Foundation
@testable import Tekyida

/// Shared construction helpers so every test gets a fully isolated `AppState`:
/// fake backend, temp-directory cache, and a private UserDefaults suite.
enum TestSupport {
    /// Fresh temporary directory unique per call; cleaned up by the OS.
    static func temporaryDirectory() -> URL {
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("tekyida-tests-\(UUID().uuidString)", isDirectory: true)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    /// OfflineCache sandboxed to a temp directory instead of Application Support.
    static func makeTemporaryCache() -> OfflineCache {
        OfflineCache(directory: temporaryDirectory())
    }

    /// Private UserDefaults suite; call `removeDefaults` with the returned
    /// name in teardown (unique names per call keep any leakage contained).
    static func makeIsolatedDefaults() -> (defaults: UserDefaults, suiteName: String) {
        let suiteName = "tekyida-tests-\(UUID().uuidString)"
        return (UserDefaults(suiteName: suiteName)!, suiteName)
    }

    static func removeDefaults(suiteName: String) {
        UserDefaults.standard.removePersistentDomain(forName: suiteName)
    }

    /// Deterministic `AppState` for unit tests: no Keychain reads beyond the
    /// injected fake, no NWPathMonitor, no automatic restore network task.
    /// `backend` has no default on purpose: `MockBackend` is MainActor-isolated
    /// and its initializer cannot be evaluated as a nonisolated default arg.
    @MainActor
    static func makeState(
        backend: BackendAPI,
        cache: OfflineCache = OfflineCache(directory: temporaryDirectory()),
        defaults: UserDefaults = UserDefaults(suiteName: "tekyida-tests-\(UUID().uuidString)")!
    ) -> AppState {
        AppState(
            backend: backend,
            offlineCache: cache,
            defaults: defaults,
            startSideEffects: false
        )
    }

    /// Signed-in variant with an empty backend and offline queue cleared.
    @MainActor
    static func makeSignedInState(backend: BackendAPI) -> AppState {
        let state = makeState(backend: backend)
        state.userEmail = "user@tekyida.app"
        state.isAuthenticated = true
        state.isOnline = true
        return state
    }

    /// Yields the main actor until the condition holds (for fire-and-forget
    /// tasks that must settle before assertions run).
    @MainActor
    static func waitOnMainActor(until condition: @MainActor () -> Bool, timeout: TimeInterval = 3) async {
        let deadline = Date().addingTimeInterval(timeout)
        while !condition() && Date() < deadline {
            await Task.yield()
        }
    }
}
