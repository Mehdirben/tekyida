import SwiftUI

// MARK: - Scrolling Brand Header (plain, no glass)
public struct BrandLogoHeader: View {
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
        }
        .fixedSize()
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
