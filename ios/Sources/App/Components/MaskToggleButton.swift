import SwiftUI

// MARK: - Reusable Amount Mask Toggle Button
public struct MaskToggleButton: View {
    @Binding var isMasked: Bool

    public init(isMasked: Binding<Bool>) {
        self._isMasked = isMasked
    }

    public var body: some View {
        Button(action: {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            isMasked.toggle()
        }) {
            Image(systemName: isMasked ? "eye.slash.fill" : "eye.fill")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .padding(10)
                .background(Color.white.opacity(0.1), in: Circle())
        }
    }
}
