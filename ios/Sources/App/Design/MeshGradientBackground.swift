import SwiftUI

// MARK: - Mesh Gradient Background
// Native MeshGradient on iOS 18+; hand-drawn blurred blobs below iOS 18.
public struct MeshGradientBackground: View {
    @Environment(\.colorScheme) private var colorScheme
    @State private var animateBlobs = false

    public init() {}

    public var body: some View {
        ZStack {
            Color.dynamicBackground(for: colorScheme)
                .ignoresSafeArea()

            if #available(iOS 18.0, *) {
                GeometryReader { proxy in
                    nativeMeshGradient(size: proxy.size)
                }
            } else if colorScheme == .dark {
                legacyBlobs(dark: true)
            } else {
                legacyBlobs(dark: false)
            }

            // Blur diffusion sheet for silky liquid frosted glass effect
            Rectangle()
                .fill(.ultraThinMaterial.opacity(0.4))
                .ignoresSafeArea()
        }
        .ignoresSafeArea()
        .onAppear {
            withAnimation(.easeInOut(duration: 8).repeatForever(autoreverses: true)) {
                animateBlobs.toggle()
            }
        }
    }

    // MARK: - Native Mesh Gradient (iOS 18+)
    @available(iOS 18.0, *)
    private func nativeMeshGradient(size: CGSize) -> some View {
        let shift: Float = animateBlobs ? 0.14 : 0.0
        let width = Float(size.width)
        let height = Float(size.height)

        // Normalize an optional pixel offset into the 0...1 point space.
        func point(_ x: Float, _ y: Float, dx: Float = 0, dy: Float = 0) -> SIMD2<Float> {
            SIMD2<Float>(
                min(max(x + dx / max(width, 1), 0), 1),
                min(max(y + dy / max(height, 1), 0), 1)
            )
        }

        let colors: [Color] = colorScheme == .dark
            ? [
                Color(red: 26 / 255.0, green: 31 / 255.0, blue: 72 / 255.0),
                Color(red: 21 / 255.0, green: 29 / 255.0, blue: 58 / 255.0),
                Color(red: 42 / 255.0, green: 21 / 255.0, blue: 48 / 255.0),
                Color(red: 21 / 255.0, green: 29 / 255.0, blue: 58 / 255.0),
                Color(red: 67 / 255.0, green: 82 / 255.0, blue: 136 / 255.0).opacity(0.55),
                Color(red: 42 / 255.0, green: 21 / 255.0, blue: 48 / 255.0),
                Color(red: 26 / 255.0, green: 31 / 255.0, blue: 72 / 255.0),
                Color(red: 42 / 255.0, green: 21 / 255.0, blue: 48 / 255.0),
                Color(red: 21 / 255.0, green: 29 / 255.0, blue: 58 / 255.0),
            ]
            : [
                Color(red: 195 / 255.0, green: 209 / 255.0, blue: 255 / 255.0),
                Color(red: 224 / 255.0, green: 212 / 255.0, blue: 247 / 255.0),
                Color(red: 245 / 255.0, green: 208 / 255.0, blue: 224 / 255.0),
                Color(red: 224 / 255.0, green: 212 / 255.0, blue: 247 / 255.0),
                Color(red: 252 / 255.0, green: 228 / 255.0, blue: 184 / 255.0),
                Color(red: 245 / 255.0, green: 208 / 255.0, blue: 224 / 255.0),
                Color(red: 252 / 255.0, green: 228 / 255.0, blue: 184 / 255.0),
                Color(red: 245 / 255.0, green: 208 / 255.0, blue: 224 / 255.0),
                Color(red: 195 / 255.0, green: 209 / 255.0, blue: 255 / 255.0),
            ]

        return MeshGradient(
            width: 3,
            height: 3,
            points: [
                point(0, 0, dx: shift * 40, dy: shift * 30),
                point(0.5, 0, dy: -shift * 60),
                point(1, 0, dx: -shift * 50, dy: shift * 20),
                point(0, 0.5, dx: -shift * 60, dy: -shift * 20),
                point(0.5, 0.5),
                point(1, 0.5, dx: shift * 60, dy: shift * 20),
                point(0, 1, dx: shift * 30, dy: -shift * 40),
                point(0.5, 1, dy: shift * 60),
                point(1, 1, dx: -shift * 40, dy: -shift * 30),
            ],
            colors: colors
        )
    }

    // MARK: - Legacy Blurred Blobs (pre-iOS 18)
    @ViewBuilder
    private func legacyBlobs(dark: Bool) -> some View {
        GeometryReader { proxy in
            let width = proxy.size.width
            let height = proxy.size.height

            ZStack {
                Circle()
                    .fill(dark
                        ? Color(red: 26 / 255.0, green: 31 / 255.0, blue: 72 / 255.0).opacity(0.85)
                        : Color(red: 195 / 255.0, green: 209 / 255.0, blue: 255 / 255.0).opacity(0.75))
                    .frame(width: width * 0.9, height: width * 0.9)
                    .offset(x: animateBlobs ? -width * 0.2 : -width * 0.35,
                            y: animateBlobs ? -height * 0.15 : -height * 0.25)
                    .blur(radius: 65)

                Circle()
                    .fill(dark
                        ? Color(red: 42 / 255.0, green: 21 / 255.0, blue: 48 / 255.0).opacity(0.75)
                        : Color(red: 245 / 255.0, green: 208 / 255.0, blue: 224 / 255.0).opacity(0.65))
                    .frame(width: width * 0.85, height: width * 0.85)
                    .offset(x: animateBlobs ? width * 0.25 : width * 0.35,
                            y: animateBlobs ? -height * 0.05 : -height * 0.12)
                    .blur(radius: 60)

                Circle()
                    .fill(dark
                        ? Color(red: 21 / 255.0, green: 29 / 255.0, blue: 58 / 255.0).opacity(0.85)
                        : Color(red: 252 / 255.0, green: 228 / 255.0, blue: 184 / 255.0).opacity(0.55))
                    .frame(width: width * 0.75, height: width * 0.75)
                    .offset(x: animateBlobs ? width * 0.1 : -width * 0.1,
                            y: animateBlobs ? height * 0.35 : height * 0.25)
                    .blur(radius: 70)

                if !dark {
                    Circle()
                        .fill(Color(red: 224 / 255.0, green: 212 / 255.0, blue: 247 / 255.0).opacity(0.65))
                        .frame(width: width * 0.95, height: width * 0.95)
                        .offset(x: animateBlobs ? -width * 0.15 : width * 0.1,
                                y: animateBlobs ? height * 0.5 : height * 0.4)
                        .blur(radius: 80)
                }
            }
        }
    }
}
