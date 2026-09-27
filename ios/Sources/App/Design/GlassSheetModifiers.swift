import SwiftUI

// MARK: - Sheet Presentation Modifiers

public extension View {
    /// Native modal presentation: system sheet with detents and drag indicator.
    /// On iOS 26+ the system sheet already renders with the native Liquid Glass
    /// treatment and animations — no custom background overrides.
    func liquidGlassSheet(
        detents: Set<PresentationDetent> = [.large],
        cornerRadius: CGFloat = AppTheme.radiusSheet
    ) -> some View {
        self
            .presentationDetents(detents)
            .presentationDragIndicator(.visible)
    }

    /// Content-fitted modal presentation: measures the (fixed-size) content once
    /// and sizes the sheet to wrap it exactly — no dead space below the content,
    /// and a shorter sheet gives the keyboard room so it lifts instead of
    /// growing to full height. Still a partial detent, so the native Liquid
    /// Glass floating treatment is preserved on iOS 26+.
    ///
    /// - Parameter chrome: Extra points for the navigation bar and grabber area.
    func fittedLiquidGlassSheet(chrome: CGFloat = 60) -> some View {
        modifier(FittedLiquidGlassSheetModifier(chrome: chrome))
    }

    /// Adopts tab bar minimize behavior on scroll down where available
    @ViewBuilder
    func tabBarMinimizeBehaviorOnScroll() -> some View {
        #if compiler(>=6.2)
        if #available(iOS 26.0, *) {
            self.tabBarMinimizeBehavior(.onScrollDown)
        } else {
            self
        }
        #else
        self
        #endif
    }

    /// Disables the iOS 26 soft (graded blur) scroll edge effect under bars.
    /// The soft blur recomposites the whole glass stack and stutters when the
    /// bar transition runs on scroll-to-top; disabling it keeps scrolling and
    /// the bar transition cheap.
    @ViewBuilder
    func topScrollEdgeDisabled() -> some View {
        if #available(iOS 26.0, *) {
            self.scrollEdgeEffectHidden(for: .top)
        } else {
            self
        }
    }
}

// MARK: - Content-Fitted Liquid Glass Sheet
public struct FittedLiquidGlassSheetModifier: ViewModifier {
    @State private var contentHeight: CGFloat = 370
    let chrome: CGFloat

    public init(chrome: CGFloat) {
        self.chrome = chrome
    }

    public func body(content: Content) -> some View {
        content
            .fixedSize(horizontal: false, vertical: true)
            .background(
                GeometryReader { proxy in
                    Color.clear
                        .onAppear { sync(proxy.size.height) }
                        .onChange(of: proxy.size.height) { _, newHeight in
                            sync(newHeight)
                        }
                }
            )
            .presentationDetents([.height(contentHeight + chrome)])
            .presentationDragIndicator(.visible)
    }

    /// Keeps the detent in sync with the intrinsic (fixed-size) content height.
    /// Updates are transaction-animated-free so they can never interfere with
    /// presentation or dismissal transitions, and the measured height is
    /// independent of the sheet size (fixedSize) so there is no feedback loop.
    private func sync(_ height: CGFloat) {
        guard height > 0, abs(height - contentHeight) > 0.5 else { return }
        var transaction = SwiftUI.Transaction()
        transaction.disablesAnimations = true
        withTransaction(transaction) {
            contentHeight = height
        }
    }
}
