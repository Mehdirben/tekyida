import SwiftUI

// MARK: - Keyboard Dismiss On Screen Tap (All Inputs)

public extension View {
    func dismissKeyboardOnTap() -> some View {
        self.modifier(DismissKeyboardOnTapModifier())
    }
}

public struct DismissKeyboardOnTapModifier: ViewModifier {
    public init() {}

    public func body(content: Content) -> some View {
        content
            .background(KeyboardDismissTrackingViewRepresentable())
            .simultaneousGesture(
                TapGesture().onEnded {
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                }
            )
    }
}

private struct KeyboardDismissTrackingViewRepresentable: UIViewRepresentable {
    func makeUIView(context: Context) -> KeyboardDismissTrackingUIView {
        let view = KeyboardDismissTrackingUIView()
        view.backgroundColor = .clear
        view.isUserInteractionEnabled = false
        return view
    }

    func updateUIView(_ uiView: KeyboardDismissTrackingUIView, context: Context) {}
}

private final class KeyboardDismissTrackingUIView: UIView, UIGestureRecognizerDelegate {
    private weak var activeWindow: UIWindow?
    private var tapRecognizer: UITapGestureRecognizer?

    override func didMoveToWindow() {
        super.didMoveToWindow()
        cleanup()
        guard let window = self.window else { return }
        self.activeWindow = window
        let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap))
        tap.cancelsTouchesInView = false
        tap.requiresExclusiveTouchType = false
        tap.delegate = self
        window.addGestureRecognizer(tap)
        self.tapRecognizer = tap
    }

    override func willMove(toWindow newWindow: UIWindow?) {
        super.willMove(toWindow: newWindow)
        if newWindow == nil {
            cleanup()
        }
    }

    private func cleanup() {
        if let tap = tapRecognizer, let win = activeWindow ?? tap.view {
            win.removeGestureRecognizer(tap)
        }
        tapRecognizer = nil
        activeWindow = nil
    }

    @objc private func handleTap() {
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }

    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
        var view: UIView? = touch.view
        while let current = view {
            if current is UITextField || current is UITextView || current is UISearchBar {
                return false
            }
            view = current.superview
        }
        return true
    }

    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool {
        return true
    }
}
