import Testing
@testable import Tekyida

@Suite("App Configuration")
struct AppConfigurationTests {
    @Test("Display name is Tekyida in the app bundle")
    func appDisplayName() {
        let bundleName = Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String
        #expect(bundleName == "Tekyida")
    }

    @Test("App transport security blocks arbitrary loads")
    func appTransportSecurityConfiguration() {
        let atsDict = Bundle.main.object(forInfoDictionaryKey: "NSAppTransportSecurity") as? [String: Any]
        let allowsArbitrary = atsDict?["NSAllowsArbitraryLoads"] as? Bool ?? false
        #expect(!allowsArbitrary, "Arbitrary HTTP loads must be blocked by default ATS configuration")
    }
}
