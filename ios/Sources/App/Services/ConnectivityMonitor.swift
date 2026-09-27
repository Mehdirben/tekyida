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
    private let retryIntervalNanoseconds: UInt64
    private var retryTask: Task<Void, Never>?

    /// - Parameter retryInterval: seconds between retry ticks; injectable so
    ///   tests can drive the loop quickly if needed.
    init(retryInterval: TimeInterval = 30) {
        retryIntervalNanoseconds = UInt64(retryInterval * 1_000_000_000)
    }

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
                try? await Task.sleep(nanoseconds: retryIntervalNanoseconds)
                guard let self else { return }
                // The callback is @MainActor-isolated, so awaiting it hops
                // to the main actor automatically.
                await self.onRetryTick?()
            }
        }
    }

    func cancel() {
        pathMonitor.cancel()
        retryTask?.cancel()
    }
}
