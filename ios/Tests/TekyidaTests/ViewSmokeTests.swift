import XCTest
import SwiftUI
@testable import Tekyida

@MainActor
final class ViewSmokeTests: XCTestCase {
    func testContentViewInitialization() {
        let view = ContentView()
        XCTAssertNotNil(view.body)
    }

    func testTekyidaScrollHeaderAndSyncBanner() {
        let state = AppState()
        let header = TekyidaScrollHeader(onManageNotebooks: {})
            .environmentObject(state)
        XCTAssertNotNil(header.body)

        let brand = BrandLogoHeader()
            .environmentObject(state)
        XCTAssertNotNil(brand.body)

        let banner = OfflineSyncBanner()
            .environmentObject(state)
        XCTAssertNotNil(banner.body)
    }

    func testSearchViewAndAddSheetsBodies() {
        let state = AppState()
        let searchView = SearchView().environmentObject(state)
        XCTAssertNotNil(searchView.body)

        let addContact = AddContactSheet(onSave: { _, _ in })
        XCTAssertNotNil(addContact.body)

        let addExp = AddExperienceSheet(contacts: [], onSave: { _, _ in })
        XCTAssertNotNil(addExp.body)

        var nbId: String? = "nb_active"
        let headerBtn = NotebookHeaderButton(
            notebooks: [Notebook(id: "nb_active", name: "Active")],
            activeNotebook: Notebook(id: "nb_active", name: "Active"),
            activeNotebookId: Binding(get: { nbId }, set: { nbId = $0 }),
            onManage: {}
        )
        XCTAssertNotNil(headerBtn.body)
    }

    func testTransferExperienceSheetBody() {
        let state = AppState()
        let exp = Experience(notebookId: "nb1", name: "Dinner")
        let sheet = TransferExperienceSheet(experience: exp, onTransfer: { _ in })
            .environmentObject(state)
        XCTAssertNotNil(sheet.body)
    }

    func testNotebookManagerSheetBody() {
        let state = AppState()
        let sheet = NotebookManagerSheet()
            .environmentObject(state)
        XCTAssertNotNil(sheet.body)
    }
}
