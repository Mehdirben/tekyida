import SwiftUI

// MARK: - Pending Sync Indicator
// Small warning-colored sync icon shown next to any item that has local
// changes not yet synced to the backend.
public struct PendingSyncIndicator: View {
    let size: CGFloat

    public init(size: CGFloat = 10) {
        self.size = size
    }

    public var body: some View {
        Image(systemName: "arrow.triangle.2.circlepath")
            .font(.system(size: size, weight: .bold))
            .foregroundColor(AppTheme.warning)
    }
}
