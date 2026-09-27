import SwiftUI

// MARK: - App Navigation Tabs
public enum AppTab: Int, CaseIterable, Identifiable, Hashable, Sendable {
    case dashboard = 0
    case experiences = 1
    case settings = 2
    case search = 3

    public var id: Int { rawValue }

    public var title: String {
        switch self {
        case .dashboard: return tr("tab.dashboard")
        case .experiences: return tr("tab.experiences")
        case .settings: return tr("tab.settings")
        case .search: return tr("tab.search")
        }
    }

    public var icon: String {
        switch self {
        case .dashboard: return "house"
        case .experiences: return "safari"
        case .settings: return "gearshape"
        case .search: return "magnifyingglass"
        }
    }
}
