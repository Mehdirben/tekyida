import SwiftUI

// MARK: - Mesh Gradient Background
// Native MeshGradient on iOS 18+; hand-drawn blurred blobs below iOS 18.
// Static (no infinite animation) so modal drags stay smooth.
public struct MeshGradientBackground: View {
    @Environment(\.colorScheme) private var colorScheme

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
    }

    // MARK: - Native Mesh Gradient (iOS 18+)
    @available(iOS 18.0, *)
    private func nativeMeshGradient(size: CGSize) -> some View {
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
                SIMD2<Float>(0, 0), SIMD2<Float>(0.5, 0), SIMD2<Float>(1, 0),
                SIMD2<Float>(0, 0.5), SIMD2<Float>(0.5, 0.5), SIMD2<Float>(1, 0.5),
                SIMD2<Float>(0, 1), SIMD2<Float>(0.5, 1), SIMD2<Float>(1, 1),
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
                    .offset(x: -width * 0.28,
                            y: -height * 0.2)
                    .blur(radius: 65)

                Circle()
                    .fill(dark
                        ? Color(red: 42 / 255.0, green: 21 / 255.0, blue: 48 / 255.0).opacity(0.75)
                        : Color(red: 245 / 255.0, green: 208 / 255.0, blue: 224 / 255.0).opacity(0.65))
                    .frame(width: width * 0.85, height: width * 0.85)
                    .offset(x: width * 0.3,
                            y: -height * 0.08)
                    .blur(radius: 60)

                Circle()
                    .fill(dark
                        ? Color(red: 21 / 255.0, green: 29 / 255.0, blue: 58 / 255.0).opacity(0.85)
                        : Color(red: 252 / 255.0, green: 228 / 255.0, blue: 184 / 255.0).opacity(0.55))
                    .frame(width: width * 0.75, height: width * 0.75)
                    .offset(x: width * 0.0,
                            y: height * 0.3)
                    .blur(radius: 70)

                if !dark {
                    Circle()
                        .fill(Color(red: 224 / 255.0, green: 212 / 255.0, blue: 247 / 255.0).opacity(0.65))
                        .frame(width: width * 0.95, height: width * 0.95)
                        .offset(x: -width * 0.02,
                                y: height * 0.45)
                        .blur(radius: 80)
                }
            }
        }
    }
}
