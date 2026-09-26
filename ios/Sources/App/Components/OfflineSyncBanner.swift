import SwiftUI

struct OfflineSyncBanner: View {
    @EnvironmentObject private var state: AppState

    var body: some View {
        if state.shouldShowSyncStatus {
            HStack(spacing: 8) {
                if state.isSyncing {
                    ProgressView().controlSize(.small)
                } else {
                    Image(systemName: state.isOnline ? "arrow.triangle.2.circlepath" : "wifi.slash")
                        .font(.caption.bold())
                }

                Text(statusText)
                    .font(.caption.weight(.semibold))
                    .lineLimit(1)

                Spacer(minLength: 0)
            }
            .foregroundStyle(state.isOnline ? AppTheme.warning : Color.secondary)
            .padding(.horizontal, 16)
            .padding(.vertical, 7)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(state.isOnline ? AppTheme.warningBg : Color(uiColor: .secondarySystemBackground))
            .accessibilityElement(children: .combine)
        }
    }

    private var statusText: String {
        if state.isSyncing { return "Syncing offline changes…" }
        if !state.isOnline { return "Offline. Changes will sync when you reconnect." }
        if !state.isAuthenticated && state.pendingSyncCount > 0 {
            return "Sign in to the account with pending offline changes."
        }
        if state.pendingSyncCount == 1 { return "1 change waiting to sync." }
        return "\(state.pendingSyncCount) changes waiting to sync."
    }
}
