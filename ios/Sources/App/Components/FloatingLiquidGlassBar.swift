import SwiftUI

// MARK: - Floating Liquid Glass Tab Bar (Apple Liquid Glass HIG Specification)
public struct FloatingLiquidGlassBar: View {
    @Binding var selectedTab: AppTab
    @Namespace private var glassAnimation
    @Environment(\.colorScheme) private var colorScheme

    // Primary navigation tabs housed inside the floating capsule pill
    private let primaryTabs: [AppTab] = [.dashboard, .experiences, .settings]

    public init(selectedTab: Binding<AppTab>) {
        self._selectedTab = selectedTab
    }

    public var body: some View {
        GlassEffectContainer {
            HStack(spacing: 12) {
                // MARK: - 1. Main Floating Capsule Pill
                mainCapsulePill

                // MARK: - 2. Detached Circular Search Bubble
                detachedSearchBubble
            }
            .padding(.horizontal, 20)
        }
    }

    // MARK: - Main Capsule Pill
    private var mainCapsulePill: some View {
        HStack(spacing: 6) {
            ForEach(primaryTabs) { tab in
                let isSelected = selectedTab == tab

                Button(action: {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    withAnimation(.spring(response: 0.34, dampingFraction: 0.74)) {
                        selectedTab = tab
                    }
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: isSelected ? tab.activeIcon : tab.icon)
                            .font(.system(size: 16, weight: isSelected ? .bold : .medium))

                        if isSelected {
                            Text(tab.title)
                                .font(.subheadline.bold())
                                .lineLimit(1)
                                .transition(.opacity.combined(with: .scale(scale: 0.9)))
                        }
                    }
                    .foregroundColor(isSelected ? .white : (colorScheme == .dark ? Color.white.opacity(0.7) : Color.black.opacity(0.65)))
                    .padding(.vertical, 10)
                    .padding(.horizontal, isSelected ? 16 : 14)
                    .background {
                        if isSelected {
                            Capsule(style: .continuous)
                                .fill(
                                    LinearGradient(
                                        colors: [AppTheme.primary, AppTheme.primaryDark],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .overlay {
                                    // Specular top highlight on the active bubble
                                    Capsule(style: .continuous)
                                        .stroke(
                                            LinearGradient(
                                                stops: [
                                                    .init(color: Color.white.opacity(0.65), location: 0.0),
                                                    .init(color: Color.white.opacity(0.2), location: 0.4),
                                                    .init(color: Color.clear, location: 1.0)
                                                ],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            ),
                                            lineWidth: 1.2
                                        )
                                }
                                .shadow(color: AppTheme.primary.opacity(0.4), radius: 8, x: 0, y: 4)
                                .matchedGeometryEffect(id: "activeGlassTabPill", in: glassAnimation)
                        }
                    }
                }
                .buttonStyle(ScaleTouchStyle())
            }
        }
        .padding(6)
        .background {
            Capsule(style: .continuous)
                .fill(colorScheme == .dark ? Color.black.opacity(0.45) : Color.white.opacity(0.65))
                .background(.ultraThinMaterial, in: Capsule(style: .continuous))
        }
        .overlay {
            // Specular rim around the floating capsule
            Capsule(style: .continuous)
                .stroke(
                    LinearGradient(
                        stops: [
                            .init(color: colorScheme == .dark ? Color.white.opacity(0.4) : Color.white.opacity(0.85), location: 0.0),
                            .init(color: colorScheme == .dark ? Color.white.opacity(0.1) : Color.white.opacity(0.3), location: 0.5),
                            .init(color: Color.clear, location: 1.0)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1.2
                )
        }
        .shadow(
            color: colorScheme == .dark ? Color.black.opacity(0.4) : Color(red: 90 / 255.0, green: 107 / 255.0, blue: 170 / 255.0).opacity(0.18),
            radius: 18,
            x: 0,
            y: 8
        )
    }

    // MARK: - Detached Circular Search Bubble
    private var detachedSearchBubble: some View {
        let isSelected = selectedTab == .search

        return Button(action: {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            withAnimation(.spring(response: 0.34, dampingFraction: 0.74)) {
                selectedTab = .search
            }
        }) {
            ZStack {
                Circle()
                    .fill(
                        isSelected
                            ? AnyShapeStyle(
                                LinearGradient(
                                    colors: [AppTheme.primary, AppTheme.primaryDark],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            : AnyShapeStyle(
                                colorScheme == .dark ? Color.black.opacity(0.45) : Color.white.opacity(0.65)
                            )
                    )
                    .background(
                        isSelected ? nil : AnyView(Circle().fill(.ultraThinMaterial))
                    )
                    .overlay {
                        Circle()
                            .stroke(
                                LinearGradient(
                                    stops: [
                                        .init(color: isSelected ? Color.white.opacity(0.65) : (colorScheme == .dark ? Color.white.opacity(0.4) : Color.white.opacity(0.85)), location: 0.0),
                                        .init(color: isSelected ? Color.white.opacity(0.2) : (colorScheme == .dark ? Color.white.opacity(0.1) : Color.white.opacity(0.3)), location: 0.5),
                                        .init(color: Color.clear, location: 1.0)
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 1.2
                            )
                    }
                    .shadow(
                        color: isSelected
                            ? AppTheme.primary.opacity(0.45)
                            : (colorScheme == .dark ? Color.black.opacity(0.4) : Color(red: 90 / 255.0, green: 107 / 255.0, blue: 170 / 255.0).opacity(0.18)),
                        radius: isSelected ? 12 : 18,
                        x: 0,
                        y: isSelected ? 4 : 8
                    )
                    .frame(width: 48, height: 48)

                Image(systemName: "magnifyingglass")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(isSelected ? .white : (colorScheme == .dark ? Color.white.opacity(0.7) : Color.black.opacity(0.65)))
            }
        }
        .buttonStyle(ScaleTouchStyle())
    }
}
