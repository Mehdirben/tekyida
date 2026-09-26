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
    let notebooks: [Notebook]
    @Binding var activeNotebookId: String?
    let onManageNotebooks: () -> Void

    public init(
        notebooks: [Notebook],
        activeNotebookId: Binding<String?>,
        onManageNotebooks: @escaping () -> Void
    ) {
        self.notebooks = notebooks
        self._activeNotebookId = activeNotebookId
        self.onManageNotebooks = onManageNotebooks
    }

    public var body: some View {
        HStack(spacing: 12) {
            BrandLogoHeader()

            Spacer()

            NotebookHeaderButton(
                notebooks: notebooks,
                activeNotebookId: $activeNotebookId,
                onManage: onManageNotebooks
            )
        }
        .padding(.top, 8)
    }
}
