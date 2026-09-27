import Foundation
import Network

/// Wraps `NWPathMonitor` and a periodic retry timer, reporting through
/// MainActor callbacks so `AppState` can react without owning the networking
/// plumbing. Safe to cancel from `deinit` (the class is not actor-isolated).
final class ConnectivityMonitor {
    /// Fired on every path update (online = `true`).
    var onPathChange: (@MainActor (Bool) async -> Void)?
    /// Fired roughly every 30 seconds so queued offline work can retry.
    var onRetryTick: (@MainActor () async -> Void)?

    private let pathMonitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "com.tekyida.network-monitor")
    private var retryTask: Task<Void, Never>?

    func start() {
        pathMonitor.pathUpdateHandler = { [weak self] path in
            let online = path.status == .satisfied
            Task { @MainActor [weak self] in
                await self?.onPathChange?(online)
            }
        }
        pathMonitor.start(queue: monitorQueue)
        retryTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 30_000_000_000)
                guard let self else { return }
                await MainActor.run {
                    await self.onRetryTick?()
                }
            }
        }
    }

    func cancel() {
        pathMonitor.cancel()
        retryTask?.cancel()
    }
}
