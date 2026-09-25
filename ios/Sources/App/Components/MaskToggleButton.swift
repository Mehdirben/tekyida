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
                .frame(width: 36, height: 36)
                .liquidGlassPill()
        }
    }
}
