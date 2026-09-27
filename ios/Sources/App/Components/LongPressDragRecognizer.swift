import SwiftUI

// MARK: - UIKit Long-Press Drag Recognizer (Reusable)
/// A real UILongPressGestureRecognizer drives drag interactions:
/// .began fires only after a genuine hold, so a quick tap can never lift the
/// element, and .ended/.cancelled/.failed are always delivered, so the drag
/// can never get stuck. Moving before the hold completes fails the recognizer
/// and a parent scroll view's pan takes over instead.
///
/// Overlay this on any row to power custom press-and-hold reordering.
public struct LongPressDragRecognizer: UIViewRepresentable {
    let minimumPressDuration: TimeInterval
    let allowableMovement: CGFloat
    let onBegan: () -> Void
    let onChanged: (_ translation: CGPoint, _ location: CGPoint) -> Void
    let onEnded: () -> Void

    public init(
        minimumPressDuration: TimeInterval = 0.25,
        allowableMovement: CGFloat = 12,
        onBegan: @escaping () -> Void,
        onChanged: @escaping (_ translation: CGPoint, _ location: CGPoint) -> Void,
        onEnded: @escaping () -> Void
    ) {
        self.minimumPressDuration = minimumPressDuration
        self.allowableMovement = allowableMovement
        self.onBegan = onBegan
        self.onChanged = onChanged
        self.onEnded = onEnded
    }

    public func makeCoordinator() -> Coordinator {
        Coordinator(onBegan: onBegan, onChanged: onChanged, onEnded: onEnded)
    }

    public func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.backgroundColor = .clear
        let recognizer = UILongPressGestureRecognizer(
            target: context.coordinator,
            action: #selector(Coordinator.handle(_:))
        )
        recognizer.minimumPressDuration = minimumPressDuration
        recognizer.allowableMovement = allowableMovement
        view.addGestureRecognizer(recognizer)
        return view
    }

    public func updateUIView(_ uiView: UIView, context: Context) {
        context.coordinator.onBegan = onBegan
        context.coordinator.onChanged = onChanged
        context.coordinator.onEnded = onEnded
    }

    public final class Coordinator: NSObject {
        var onBegan: () -> Void
        var onChanged: (CGPoint, CGPoint) -> Void
        var onEnded: () -> Void
        private var initialLocation: CGPoint = .zero

        init(
            onBegan: @escaping () -> Void,
            onChanged: @escaping (CGPoint, CGPoint) -> Void,
            onEnded: @escaping () -> Void
        ) {
            self.onBegan = onBegan
            self.onChanged = onChanged
            self.onEnded = onEnded
            super.init()
        }

        @objc func handle(_ recognizer: UILongPressGestureRecognizer) {
            let location = recognizer.location(in: nil)
            switch recognizer.state {
            case .began:
                initialLocation = location
                onBegan()
            case .changed:
                let translation = CGPoint(
                    x: location.x - initialLocation.x,
                    y: location.y - initialLocation.y
                )
                onChanged(translation, location)
            case .ended, .cancelled, .failed:
                onEnded()
            default:
                break
            }
        }
    }
}
