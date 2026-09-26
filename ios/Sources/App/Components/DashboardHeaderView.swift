import SwiftUI

// MARK: - Scrolling Brand Header (plain, no glass)
public struct BrandLogoHeader: View {
    @EnvironmentObject private var state: AppState

    public init() {}

    public var body: some View {
        HStack(spacing: 7) {
            Image("AppLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 26, height: 26)
                .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))

            Text("Tekyida")
                .font(.system(size: 17, weight: .semibold, design: .rounded))
                .foregroundColor(.primary)

            if state.shouldShowSyncStatus {
                syncStatusBadge
            }
        }
        .fixedSize()
    }

    @ViewBuilder
    private var syncStatusBadge: some View {
        HStack(spacing: 4) {
            if state.isSyncing {
                ProgressView()
                    .controlSize(.mini)
            } else if !state.isOnline {
                Image(systemName: "wifi.slash")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(AppTheme.warning)
            } else if state.pendingSyncCount > 0 {
                Image(systemName: "arrow.triangle.2.circlepath")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(AppTheme.warning)
                if state.pendingSyncCount > 1 {
                    Text("\(state.pendingSyncCount)")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(AppTheme.warning)
                }
            }
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .background(
            Capsule()
                .fill(AppTheme.warningBg.opacity(0.85))
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel(syncStatusLabel)
    }

    private var syncStatusLabel: String {
        if state.isSyncing { return tr("sync.syncing") }
        if !state.isOnline { return tr("sync.offline") }
        return String(format: tr("sync.pendingCount"), state.pendingSyncCount)
    }
}

// MARK: - Shared Scrolling Tekyida Header
// Brand left + notebook menu right, placed in the page ScrollView so it scrolls with content.
public struct TekyidaScrollHeader: View {
    @EnvironmentObject private var state: AppState
    let onManageNotebooks: () -> Void

    public init(onManageNotebooks: @escaping () -> Void) {
        self.onManageNotebooks = onManageNotebooks
    }

    public var body: some View {
        HStack(spacing: 12) {
            BrandLogoHeader()

            Spacer()

            NotebookHeaderButton(
                notebooks: state.activeNotebooksList,
                activeNotebook: state.activeNotebook,
                activeNotebookId: Binding(
                    get: { state.activeNotebookId },
                    set: { id in
                        if let id {
                            state.selectNotebook(id)
                        } else {
                            state.activeNotebookId = nil
                        }
                    }
                ),
                onManage: onManageNotebooks
            )
        }
        .padding(.top, 8)
    }
}
