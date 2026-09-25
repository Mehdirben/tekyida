import SwiftUI

// MARK: - Mesh Gradient Background
public struct MeshGradientBackground: View {
    @Environment(\.colorScheme) private var colorScheme
    @State private var animateBlobs = false

    public init() {}

    public var body: some View {
        GeometryReader { proxy in
            let width = proxy.size.width
            let height = proxy.size.height

            ZStack {
                // Base background fill
                Color.dynamicBackground(for: colorScheme)
                    .ignoresSafeArea()

                // Fluid chromatic blobs
                if colorScheme == .dark {
                    darkBlobs(width: width, height: height)
                } else {
                    lightBlobs(width: width, height: height)
                }

                // Blur diffusion sheet for silky liquid frosted glass effect
                Rectangle()
                    .fill(.ultraThinMaterial.opacity(0.4))
                    .ignoresSafeArea()
            }
            .onAppear {
                withAnimation(.easeInOut(duration: 8).repeatForever(autoreverses: true)) {
                    animateBlobs.toggle()
                }
            }
        }
        .ignoresSafeArea()
    }

    @ViewBuilder
    private func lightBlobs(width: CGFloat, height: CGFloat) -> some View {
        ZStack {
            // Blob 1: Soft Periwinkle
            Circle()
                .fill(Color(red: 195 / 255.0, green: 209 / 255.0, blue: 255 / 255.0).opacity(0.75))
                .frame(width: width * 0.9, height: width * 0.9)
                .offset(
                    x: animateBlobs ? -width * 0.2 : -width * 0.35,
                    y: animateBlobs ? -height * 0.15 : -height * 0.25
                )
                .blur(radius: 65)

            // Blob 2: Soft Rose / Pink
            Circle()
                .fill(Color(red: 245 / 255.0, green: 208 / 255.0, blue: 224 / 255.0).opacity(0.65))
                .frame(width: width * 0.85, height: width * 0.85)
                .offset(
                    x: animateBlobs ? width * 0.25 : width * 0.35,
                    y: animateBlobs ? -height * 0.05 : -height * 0.12
                )
                .blur(radius: 60)

            // Blob 3: Warm Peach / Amber
            Circle()
                .fill(Color(red: 252 / 255.0, green: 228 / 255.0, blue: 184 / 255.0).opacity(0.55))
                .frame(width: width * 0.75, height: width * 0.75)
                .offset(
                    x: animateBlobs ? width * 0.1 : -width * 0.1,
                    y: animateBlobs ? height * 0.35 : height * 0.25
                )
                .blur(radius: 70)

            // Blob 4: Soft Lilac
            Circle()
                .fill(Color(red: 224 / 255.0, green: 212 / 255.0, blue: 247 / 255.0).opacity(0.65))
                .frame(width: width * 0.95, height: width * 0.95)
                .offset(
                    x: animateBlobs ? -width * 0.15 : width * 0.1,
                    y: animateBlobs ? height * 0.5 : height * 0.4
                )
                .blur(radius: 80)
        }
    }

    @ViewBuilder
    private func darkBlobs(width: CGFloat, height: CGFloat) -> some View {
        ZStack {
            // Blob 1: Deep Navy
            Circle()
                .fill(Color(red: 26 / 255.0, green: 31 / 255.0, blue: 72 / 255.0).opacity(0.85))
                .frame(width: width * 1.1, height: width * 1.1)
                .offset(
                    x: animateBlobs ? -width * 0.2 : -width * 0.35,
                    y: animateBlobs ? -height * 0.15 : -height * 0.25
                )
                .blur(radius: 75)

            // Blob 2: Deep Plum / Rose
            Circle()
                .fill(Color(red: 42 / 255.0, green: 21 / 255.0, blue: 48 / 255.0).opacity(0.75))
                .frame(width: width * 0.9, height: width * 0.9)
                .offset(
                    x: animateBlobs ? width * 0.25 : width * 0.35,
                    y: animateBlobs ? -height * 0.05 : -height * 0.12
                )
                .blur(radius: 70)

            // Blob 3: Deep Slate Indigo
            Circle()
                .fill(Color(red: 21 / 255.0, green: 29 / 255.0, blue: 58 / 255.0).opacity(0.85))
                .frame(width: width * 1.0, height: width * 1.0)
                .offset(
                    x: animateBlobs ? -width * 0.1 : width * 0.15,
                    y: animateBlobs ? height * 0.4 : height * 0.3
                )
                .blur(radius: 85)
        }
    }
}
