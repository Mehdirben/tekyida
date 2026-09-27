import SwiftUI

// MARK: - Touch Feedback (Haptics on Touch Down for Menus, Buttons, and Inputs)

public extension View {
    func tapFeedback() -> some View {
        self.modifier(TouchFeedbackModifier())
    }
}

public struct TouchFeedbackModifier: ViewModifier {
    public init() {}

    public func body(content: Content) -> some View {
        content
            .overlay(TouchFeedbackOverlay())
            .simultaneousGesture(
                TapGesture().onEnded {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                }
            )
    }
}

private struct TouchFeedbackOverlay: UIViewRepresentable {
    func makeUIView(context: Context) -> TouchFeedbackTrackingView {
        let view = TouchFeedbackTrackingView()
        view.backgroundColor = .clear
        view.isUserInteractionEnabled = true
        return view
    }

    func updateUIView(_ uiView: TouchFeedbackTrackingView, context: Context) {}
}

private final class TouchFeedbackTrackingView: UIView {
    private static var lastFeedbackTime: TimeInterval = 0

    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        if self.bounds.contains(point) {
            let now = CACurrentMediaTime()
            if now - Self.lastFeedbackTime > 0.25 {
                Self.lastFeedbackTime = now
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            }
        }
        return nil
    }
}
