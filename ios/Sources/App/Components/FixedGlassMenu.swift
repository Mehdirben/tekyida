import SwiftUI

// MARK: - Fixed Glass Menu (iOS 26 menu label glitch workaround)
// On iOS 26 the system hides, morphs (capsule/circle shapes) and mispositions
// a Menu's label while the menu is open or dismissing — especially when the
// menu sits in a ScrollView, where the label can float outside its container.
// Marking the label with .glassEffect(.identity), wrapping the menu in a
// GlassEffectContainer and clipping it keeps the label visible and anchored.
// Older iOS versions fall back to the plain system Menu.
public struct FixedGlassMenu<Label: View, Content: View>: View {
    let content: () -> Content
    let label: () -> Label

    public init(
        @ViewBuilder content: @escaping () -> Content,
        @ViewBuilder label: @escaping () -> Label
    ) {
        self.content = content
        self.label = label
    }

    public var body: some View {
        #if compiler(>=6.2)
        if #available(iOS 26.0, *) {
            GlassEffectContainer {
                Menu {
                    content()
                } label: {
                    label()
                        .glassEffect(.identity)
                }
                .clipped()
            }
        } else {
            plainMenu
        }
        #else
        plainMenu
        #endif
    }

    private var plainMenu: some View {
        Menu {
            content()
        } label: {
            label()
        }
    }
}
