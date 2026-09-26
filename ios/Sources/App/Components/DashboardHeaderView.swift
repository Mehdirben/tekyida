import SwiftUI

// MARK: - Brand Logo Header (navbar-sized, plain, no glass)
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

// MARK: - Shared Tekyida Navigation Bar Modifier
// Custom top line: brand (plain, no glass) left + notebook menu right.
// The inset stays transparent so the screen's background continues behind it.
public struct TekyidaNavigationBarModifier: ViewModifier {
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

    public func body(content: Content) -> some View {
        content
            .toolbar(.hidden, for: .navigationBar)
            .safeAreaInset(edge: .top, spacing: 0) {
                HStack(spacing: 12) {
                    BrandLogoHeader()

                    Spacer()

                    NotebookHeaderButton(
                        notebooks: notebooks,
                        activeNotebookId: $activeNotebookId,
                        onManage: onManageNotebooks
                    )
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 10)
                .background(.clear)
            }
    }
}

public extension View {
    func tekyidaNavigationBar(
        notebooks: [Notebook],
        activeNotebookId: Binding<String?>,
        onManageNotebooks: @escaping () -> Void
    ) -> some View {
        modifier(TekyidaNavigationBarModifier(
            notebooks: notebooks,
            activeNotebookId: activeNotebookId,
            onManageNotebooks: onManageNotebooks
        ))
    }
}
