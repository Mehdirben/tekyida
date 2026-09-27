import Testing
import SwiftUI
@testable import Tekyida

// Serialized: presenter helpers read the global L10n table.
@Suite("Component Logic", .serialized)
@MainActor
struct ComponentLogicTests {
    // MARK: - AmountFormatter

    @Test("Amount formatting: signs, masking, and currency suffix")
    func amountDisplayText() {
        #expect(AmountFormatter.displayText(amount: 120, isHidden: false) == "+120.00 MAD")
        #expect(AmountFormatter.displayText(amount: 120, isHidden: false, showPlusSign: false) == "120.00 MAD")
        #expect(AmountFormatter.displayText(amount: -40.5, isHidden: false) == "-40.50 MAD")
        #expect(AmountFormatter.displayText(amount: 0, isHidden: false) == "0.00 MAD", "zero never shows a plus sign")
        #expect(AmountFormatter.displayText(amount: 99, isHidden: true) == "••••", "masking wins over everything")
        #expect(AmountFormatter.displayText(amount: 7, isHidden: false, showsCurrency: false) == "+7.00")
    }

    @Test("Amount tone: positive accent, negative danger, zero neutral")
    func amountTone() {
        #expect(AmountFormatter.tone(for: 10) == .accent)
        #expect(AmountFormatter.tone(for: -0.01) == .danger)
        #expect(AmountFormatter.tone(for: 0) == .neutral)
    }

    @Test("AmountView renders formatted text")
    func amountViewBody() {
        let view = AmountView(amount: 15, isHidden: false)
        _ = view.body
        let masked = AmountView(amount: 15, isHidden: true)
        _ = masked.body
    }

    // MARK: - SyncStatusPresenter

    @Test("Header badge label routing")
    func statusLabelRouting() {
        #expect(SyncStatusPresenter.statusLabel(isSyncing: true, isOnline: false, pendingSyncCount: 3) == "Syncing")
        #expect(SyncStatusPresenter.statusLabel(isSyncing: false, isOnline: false, pendingSyncCount: 3) == "Offline")
        #expect(SyncStatusPresenter.statusLabel(isSyncing: false, isOnline: true, pendingSyncCount: 3) == "3 pending sync")
        #expect(SyncStatusPresenter.statusLabel(isSyncing: false, isOnline: true, pendingSyncCount: 1) == "1 pending sync")
    }

    @Test("Banner text routing covers all five branches")
    func statusTextRouting() {
        #expect(SyncStatusPresenter.statusText(isSyncing: true, isOnline: false, isAuthenticated: false, pendingSyncCount: 5) == "Syncing offline changes…")
        #expect(SyncStatusPresenter.statusText(isSyncing: false, isOnline: false, isAuthenticated: false, pendingSyncCount: 5) == "Offline. Changes will sync when you reconnect.")
        #expect(SyncStatusPresenter.statusText(isSyncing: false, isOnline: true, isAuthenticated: false, pendingSyncCount: 2) == "Sign in to the account with pending offline changes.")
        #expect(SyncStatusPresenter.statusText(isSyncing: false, isOnline: true, isAuthenticated: true, pendingSyncCount: 1) == "1 change waiting to sync.")
        #expect(SyncStatusPresenter.statusText(isSyncing: false, isOnline: true, isAuthenticated: true, pendingSyncCount: 4) == "4 changes waiting to sync.")
    }

    // MARK: - GlassInputField clamping

    @Test("Character limit clamps grapheme-safe and ignores short input")
    func inputClamping() {
        #expect(GlassInputField.clamp("short", to: 10) == "short")
        #expect(GlassInputField.clamp("exactly-20-chars!", to: 20) == "exactly-20-chars!")
        #expect(GlassInputField.clamp("way-too-long-input", to: 10) == "way-too-lo")
        #expect(GlassInputField.clamp("no limit here", to: nil) == "no limit here")
        #expect(GlassInputField.clamp("👍🏽👍🏽👍🏽", to: 2) == "👍🏽👍🏽", "grapheme clusters must not be split")
        #expect(GlassInputField.clamp("ééé", to: 2) == "éé", "combining accents count as one character")
    }

    @Test("GlassInputField body evaluates with and without limits")
    func inputFieldBody() {
        var bound = "hello"
        let field = GlassInputField(
            systemImage: "person.fill",
            placeholder: "Name",
            text: Binding(get: { bound }, set: { bound = $0 }),
            characterLimit: 5
        )
        _ = field.body
        let secure = GlassInputField(placeholder: "Password", text: .constant(""), isSecure: true, characterLimit: nil)
        _ = secure.body
    }

    // MARK: - NotebookHeaderButton

    @Test("Header button label: active, archived suffix, lookup, and fallback")
    func notebookHeaderLabel() {
        let archived = Notebook(id: "arch", name: "Old Book", archived: true)
        let active = Notebook(id: "live", name: "Current Book")

        let activeButton = NotebookHeaderButton(
            notebooks: [active],
            activeNotebook: active,
            activeNotebookId: .constant("live"),
            onManage: {}
        )
        #expect(activeButton.currentName == "Current Book")

        let archivedButton = NotebookHeaderButton(
            notebooks: [archived],
            activeNotebook: archived,
            activeNotebookId: .constant("arch"),
            onManage: {}
        )
        #expect(archivedButton.currentName == "Old Book (Archived)",
                "archived notebooks must be visibly suffixed")

        let lookupButton = NotebookHeaderButton(
            notebooks: [active],
            activeNotebook: nil,
            activeNotebookId: .constant("live"),
            onManage: {}
        )
        #expect(lookupButton.currentName == "Current Book")

        let fallbackButton = NotebookHeaderButton(
            notebooks: [],
            activeNotebook: nil,
            activeNotebookId: .constant("ghost"),
            onManage: {}
        )
        #expect(fallbackButton.currentName == "Select Notebook")

        _ = activeButton.body
    }
}
