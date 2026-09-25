import SwiftUI

// MARK: - Reusable Notebook Header Button
// On iOS 26+ the toolbar itself provides the Liquid Glass chrome, so the button
// renders plain (single glass). Below iOS 26 it draws its own material pill.
public struct NotebookHeaderButton: View {
    let notebookName: String
    let onTap: () -> Void

    public init(notebookName: String, onTap: @escaping () -> Void) {
        self.notebookName = notebookName
        self.onTap = onTap
    }

    public var body: some View {
        Button(action: {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            onTap()
        }) {
            HStack(spacing: 8) {
                Image(systemName: "book.closed.fill")
                    .font(.subheadline)
                    .foregroundStyle(.tint)

                Text(notebookName)
                    .font(.subheadline.bold())
                    .foregroundColor(.primary)
                    .lineLimit(1)

                Image(systemName: "chevron.down")
                    .font(.caption2.bold())
                    .foregroundColor(.secondary)
            }
            .modifier(ConditionalPillBackground())
        }
        .modifier(ConditionalPressStyle())
    }
}

// MARK: - Version-Adaptive Button Chrome
/// Applies the material pill only on pre-iOS 26 (no double glass on the
/// system Liquid Glass toolbar); plain on iOS 26+.
private struct ConditionalPillBackground: ViewModifier {
    func body(content: Content) -> some View {
        #if compiler(>=6.2)
        if #available(iOS 26.0, *) {
            content
        } else {
            content.liquidGlassPill()
        }
        #else
        content.liquidGlassPill()
        #endif
    }
}

/// Scale press feedback only where the custom pill is used; iOS 26+ gets the
/// native glass press interaction instead.
private struct ConditionalPressStyle: ViewModifier {
    func body(content: Content) -> some View {
        #if compiler(>=6.2)
        if #available(iOS 26.0, *) {
            content
        } else {
            content.buttonStyle(ScaleTouchStyle())
        }
        #else
        content.buttonStyle(ScaleTouchStyle())
        #endif
    }
}
