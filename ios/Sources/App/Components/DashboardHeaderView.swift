import SwiftUI

// MARK: - Brand Logo Header (plain, no glass)
public struct BrandLogoHeader: View {
    public init() {}

    public var body: some View {
        HStack(spacing: 8) {
            Image("AppLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 28, height: 28)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

            Text("Tekyida")
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundColor(.primary)
        }
    }
}

// MARK: - Shared Tekyida Navigation Bar Modifier
// Trailing notebook dropdown menu only; the brand lives in the scroll
// content (top-left) so it carries no toolbar glass.
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
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    BrandLogoHeader()
                }

                ToolbarItem(placement: .topBarTrailing) {
                    NotebookHeaderButton(
                        notebooks: notebooks,
                        activeNotebookId: $activeNotebookId,
                        onManage: onManageNotebooks
                    )
                }
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
