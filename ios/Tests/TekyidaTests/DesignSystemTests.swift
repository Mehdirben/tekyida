import Testing
import SwiftUI
@testable import Tekyida

@Suite("Design System")
@MainActor
struct DesignSystemTests {
    @Test("Concentric geometric hierarchy: sheets > cards > buttons > inputs")
    func liquidGlassDesignTokensAndConcentricHierarchy() {
        #expect(AppTheme.radiusSheet > AppTheme.radiusCard)
        #expect(AppTheme.radiusCard > AppTheme.radiusButton)
        #expect(AppTheme.radiusButton >= AppTheme.radiusInput)
    }

    @Test("Concentric rectangle produces a non-empty path")
    func concentricRectanglePath() {
        let rect = ConcentricRectangle(cornerRadius: 16)
        let path = rect.path(in: CGRect(x: 0, y: 0, width: 200, height: 60))
        #expect(!path.isEmpty)
    }

    @Test("Glass button and card bodies evaluate")
    func glassButtonAndCardBodies() {
        let button = GlassButton("Confirm", style: .primary, size: .extraLarge) {}
        _ = button.body

        let card = GlassCard {
            Text("Test Content")
        }
        _ = card.body
    }

    @Test("Touch and keyboard modifiers attach without crashing")
    func touchAndKeyboardModifiers() {
        let button = GlassButton("Test", systemImage: "star", style: .primary, size: .large, action: {})
        _ = button.body

        let modified = Text("Hello")
            .tapFeedback()
            .dismissKeyboardOnTap()
        _ = modified
    }

    @Test("Reusable component bodies evaluate")
    func reusableComponentsRenderBodies() {
        let input = GlassInputField(
            systemImage: "person.fill",
            placeholder: "Name",
            text: .constant(""),
            characterLimit: 20
        )
        _ = input.body

        let pending = PendingSyncIndicator(size: 10)
        _ = pending.body

        let section = SectionHeaderView(
            title: "Contacts",
            count: 3,
            addButtonTitle: "Add",
            addButtonSystemImage: "plus",
            addAction: {}
        )
        _ = section.body

        let searchRow = SearchResultRow(
            systemImage: "person.fill",
            title: "Alice",
            itemId: "server_1",
            balance: 10,
            isMasked: false,
            onTap: {}
        )
        _ = searchRow.body
    }
}
