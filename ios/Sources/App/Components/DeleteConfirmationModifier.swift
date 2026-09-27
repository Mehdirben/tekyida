import SwiftUI

// MARK: - Confirmable Delete Modifier
// Standard destructive-confirmation alert with the app's haptic feedback,
// driven by an optional item binding: setting the item presents the alert,
// confirming calls `onDelete`, cancelling or dismissing clears the binding.
public struct DeleteConfirmationModifier<Item: Identifiable>: ViewModifier {
    @Binding var item: Item?
    let title: String
    let message: (Item?) -> String?
    let onDelete: (Item) -> Void

    public func body(content: Content) -> some View {
        content.alert(
            title,
            isPresented: Binding(
                get: { item != nil },
                set: { if !$0 { item = nil } }
            ),
            actions: {
                Button(tr("common.cancel"), role: .cancel) {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    item = nil
                }
                Button(tr("common.delete"), role: .destructive) {
                    UINotificationFeedbackGenerator().notificationOccurred(.warning)
                    if let target = item {
                        onDelete(target)
                        item = nil
                    }
                }
            },
            message: {
                if let text = message(item), !text.isEmpty {
                    Text(text)
                }
            }
        )
    }
}

public extension View {
    func confirmableDelete<T: Identifiable>(
        item: Binding<T?>,
        title: String,
        message: @escaping (T?) -> String? = { _ in nil },
        onDelete: @escaping (T) -> Void
    ) -> some View {
        modifier(DeleteConfirmationModifier(
            item: item,
            title: title,
            message: message,
            onDelete: onDelete
        ))
    }
}
