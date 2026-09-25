import SwiftUI

// MARK: - Reusable PIN Pad View (6-digit)
public struct PinPadView: View {
    let title: String?
    @Binding var pin: String
    let isError: Bool
    let onComplete: (String) -> Void

    @State private var shakeOffset: CGFloat = 0

    public init(
        title: String? = nil,
        pin: Binding<String>,
        isError: Bool = false,
        onComplete: @escaping (String) -> Void
    ) {
        self.title = title
        self._pin = pin
        self.isError = isError
        self.onComplete = onComplete
    }

    public var body: some View {
        VStack(spacing: 28) {
            if let title = title {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(isError ? AppTheme.danger : .secondary)
                    .multilineTextAlignment(.center)
            }

            // 6-digit indicator dots
            HStack(spacing: 16) {
                ForEach(0..<6, id: \.self) { index in
                    Circle()
                        .fill(index < pin.count ? AppTheme.primary : Color.clear)
                        .frame(width: 14, height: 14)
                        .overlay {
                            Circle()
                                .stroke(
                                    index < pin.count ? AppTheme.primary : Color.secondary.opacity(0.4),
                                    lineWidth: 2
                                )
                        }
                        .scaleEffect(index < pin.count ? 1.15 : 1.0)
                        .animation(.spring(response: 0.25, dampingFraction: 0.6), value: pin.count)
                }
            }
            .offset(x: shakeOffset)

            // 3x4 Keypad Grid
            VStack(spacing: 16) {
                ForEach(0..<3) { row in
                    HStack(spacing: 24) {
                        ForEach(1...3, id: \.self) { col in
                            let num = row * 3 + col
                            keypadButton(label: "\(num)") {
                                appendDigit("\(num)")
                            }
                        }
                    }
                }

                HStack(spacing: 24) {
                    // Empty spacer
                    Color.clear
                        .frame(width: 72, height: 72)

                    // Zero
                    keypadButton(label: "0") {
                        appendDigit("0")
                    }

                    // Delete button
                    Button(action: {
                        deleteDigit()
                    }) {
                        Image(systemName: "delete.backward")
                            .font(.title3)
                            .foregroundColor(pin.isEmpty ? .secondary.opacity(0.3) : .primary)
                            .frame(width: 72, height: 72)
                            .liquidGlassPill()
                    }
                    .disabled(pin.isEmpty)
                }
            }
        }
        .onChange(of: isError) { _, hasError in
            if hasError {
                triggerShake()
            }
        }
    }

    private func keypadButton(label: String, action: @escaping () -> Void) -> some View {
        Button(action: {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        }) {
            Text(label)
                .font(.system(size: 28, weight: .light, design: .rounded))
                .foregroundColor(.primary)
                .frame(width: 72, height: 72)
                .liquidGlassPill()
        }
        .buttonStyle(ScaleTouchStyle())
    }

    private func appendDigit(_ digit: String) {
        guard pin.count < 6 else { return }
        pin.append(digit)
        if pin.count == 6 {
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            onComplete(pin)
        }
    }

    private func deleteDigit() {
        guard !pin.isEmpty else { return }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        pin.removeLast()
    }

    private func triggerShake() {
        UINotificationFeedbackGenerator().notificationOccurred(.error)
        withAnimation(.default) {
            shakeOffset = -12
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
            withAnimation(.default) { shakeOffset = 12 }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.16) {
            withAnimation(.default) { shakeOffset = -8 }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.24) {
            withAnimation(.default) { shakeOffset = 8 }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.32) {
            withAnimation(.default) { shakeOffset = 0 }
        }
    }
}
