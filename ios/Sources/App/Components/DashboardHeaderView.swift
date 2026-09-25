import SwiftUI

// MARK: - Brand Logo Header
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

            Circle()
                .fill(AppTheme.accent)
                .frame(width: 7, height: 7)
                .shadow(color: AppTheme.accent.opacity(0.6), radius: 3)
        }
    }
}

// MARK: - Shared Tekyida Navigation Bar Modifier (Native Liquid Glass Toolbar)
public struct TekyidaNavigationBarModifier: ViewModifier {
    let notebookName: String
    let onSelectNotebook: () -> Void

    public init(notebookName: String, onSelectNotebook: @escaping () -> Void) {
        self.notebookName = notebookName
        self.onSelectNotebook = onSelectNotebook
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
                        notebookName: notebookName,
                        onTap: onSelectNotebook
                    )
                }
            }
    }
}

public extension View {
    func tekyidaNavigationBar(notebookName: String, onSelectNotebook: @escaping () -> Void) -> some View {
        modifier(TekyidaNavigationBarModifier(notebookName: notebookName, onSelectNotebook: onSelectNotebook))
    }
}

// MARK: - Dashboard & Experiences Top Header
public struct DashboardHeaderView: View {
    let notebookName: String
    let onSelectNotebook: () -> Void

    public init(notebookName: String, onSelectNotebook: @escaping () -> Void) {
        self.notebookName = notebookName
        self.onSelectNotebook = onSelectNotebook
    }

    public var body: some View {
        HStack(alignment: .center) {
            BrandLogoHeader()

            Spacer()

            // Notebook Switcher Pill Button
            NotebookHeaderButton(
                notebookName: notebookName,
                onTap: onSelectNotebook
            )
        }
        .padding(.horizontal, 2)
        .padding(.bottom, 4)
    }
}
