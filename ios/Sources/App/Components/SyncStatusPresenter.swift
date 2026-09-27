import Foundation

// MARK: - Sync Status Presentation Logic
// Pure label rules shared by the offline sync banner and the dashboard header
// badge, extracted so the branching stays unit-testable without rendering.

enum SyncStatusPresenter {
    /// Short label used by the dashboard header badge.
    static func statusLabel(isSyncing: Bool, isOnline: Bool, pendingSyncCount: Int) -> String {
        if isSyncing { return tr("sync.syncing") }
        if !isOnline { return tr("sync.offline") }
        return String(format: tr("sync.pendingCount"), pendingSyncCount)
    }

    /// Sentence shown by the offline sync banner.
    static func statusText(isSyncing: Bool, isOnline: Bool, isAuthenticated: Bool, pendingSyncCount: Int) -> String {
        if isSyncing { return tr("sync.bannerSyncing") }
        if !isOnline { return tr("sync.bannerOffline") }
        if !isAuthenticated && pendingSyncCount > 0 {
            return tr("sync.bannerSignin")
        }
        if pendingSyncCount == 1 { return tr("sync.oneWaiting") }
        return String(format: tr("sync.changesWaiting"), pendingSyncCount)
    }
}
