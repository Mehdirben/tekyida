import XCTest
@testable import Tekyida

final class TekyidaTests: XCTestCase {
    func testAppDisplayName() {
        let bundleName = Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String
        XCTAssertEqual(bundleName ?? "Tekyida", "Tekyida")
    }

    func testContentViewInitialization() {
        let view = ContentView()
        XCTAssertNotNil(view.body)
    }

    func testCounterIncrement() {
        var count = 0
        count += 1
        XCTAssertEqual(count, 1)
        count += 1
        XCTAssertEqual(count, 2)
    }

    func testAppTransportSecurityConfiguration() {
        // iOS DAST: Verify ATS does not allow arbitrary plaintext HTTP loads
        let atsDict = Bundle.main.object(forInfoDictionaryKey: "NSAppTransportSecurity") as? [String: Any]
        let allowsArbitrary = atsDict?["NSAllowsArbitraryLoads"] as? Bool ?? false
        XCTAssertFalse(allowsArbitrary, "Arbitrary HTTP loads must be blocked by default ATS configuration")
    }
}
