import XCTest
import SwiftUI
@testable import Tekyida

@MainActor
final class DesignSystemTests: XCTestCase {
    func testLiquidGlassDesignTokensAndConcentricHierarchy() {
        // Concentric geometric hierarchy: Sheets > Cards > Buttons > Inputs
        XCTAssertGreaterThan(AppTheme.radiusSheet, AppTheme.radiusCard)
        XCTAssertGreaterThan(AppTheme.radiusCard, AppTheme.radiusButton)
        XCTAssertGreaterThanOrEqual(AppTheme.radiusButton, AppTheme.radiusInput)

        // Concentric path computation produces non-empty path
        let rect = ConcentricRectangle(cornerRadius: 16)
        let path = rect.path(in: CGRect(x: 0, y: 0, width: 200, height: 60))
        XCTAssertFalse(path.isEmpty)

        // GlassButton and GlassCard instantiation
        let btn = GlassButton("Confirm", style: .primary, size: .extraLarge) {}
        XCTAssertNotNil(btn.body)

        let card = GlassCard {
            Text("Test Content")
        }
        XCTAssertNotNil(card.body)
    }

    func testTouchAndKeyboardModifiers() {
        let button = GlassButton("Test", systemImage: "star", style: .primary, size: .large, action: {})
        XCTAssertNotNil(button.body)

        let modifiedView = Text("Hello")
            .tapFeedback()
            .dismissKeyboardOnTap()
        XCTAssertNotNil(modifiedView)
    }

    func testReusableComponentsRenderBodies() {
        let input = GlassInputField(
            systemImage: "person.fill",
            placeholder: "Name",
            text: .constant(""),
            characterLimit: 20
        )
        XCTAssertNotNil(input.body)

        let pending = PendingSyncIndicator(size: 10)
        XCTAssertNotNil(pending.body)

        let section = SectionHeaderView(
            title: "Contacts",
            count: 3,
            addButtonTitle: "Add",
            addButtonSystemImage: "plus",
            addAction: {}
        )
        XCTAssertNotNil(section.body)

        let searchRow = SearchResultRow(
            systemImage: "person.fill",
            title: "Alice",
            itemId: "server_1",
            balance: 10,
            isMasked: false,
            onTap: {}
        )
        XCTAssertNotNil(searchRow.body)
    }
}
