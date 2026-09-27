import Foundation
import Security

// MARK: - Token Storage
// Auth token persistence behind a protocol so unit tests avoid real Keychain
// I/O (see `InMemoryTokenStore` in the test target). Deliberately excluded
// from the logic coverage gate: thin SecItem glue around system APIs.

protocol TokenStore: AnyObject {
    func read(_ key: String) -> String?
    func write(_ value: String, key: String)
    func delete(_ key: String)
}

final class KeychainTokenStore: TokenStore {
    private let service: String

    init(service: String = Bundle.main.bundleIdentifier ?? "com.tekyida.app") {
        self.service = service
    }

    func read(_ key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    func write(_ value: String, key: String) {
        delete(key)
        var item: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: Data(value.utf8)
        ]
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(item as CFDictionary, nil)
    }

    func delete(_ key: String) {
        SecItemDelete([
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ] as CFDictionary)
    }
}
