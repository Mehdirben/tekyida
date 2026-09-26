import Foundation
import Security

@MainActor
final class ConvexBackend {
    static let shared = ConvexBackend()
    private let deploymentURL = URL(string: "https://tekyida-convex-api.codecy.dev")!
    private let session = URLSession.shared
    private let keychainService = Bundle.main.bundleIdentifier ?? "com.tekyida.app"
    private var accessToken: String? { readKeychain("accessToken") }
    private var refreshToken: String? { readKeychain("refreshToken") }

    private init() {}

    var hasSession: Bool { accessToken != nil }

    func signIn(email: String, password: String, name: String? = nil, flow: String) async throws -> Bool {
        var params: [String: Any] = ["email": email, "password": password, "flow": flow]
        if let name { params["name"] = name }
        let value = try await requestValue(
            endpoint: "action",
            path: "auth:signIn",
            args: ["provider": "password", "params": params],
            authenticated: false,
            allowRefresh: false
        )
        return storeTokens(from: value)
    }

    func verifyEmail(email: String, code: String) async throws -> Bool {
        let value = try await requestValue(
            endpoint: "action",
            path: "auth:signIn",
            args: ["provider": "password", "params": [
                "email": email,
                "code": code,
                "flow": "email-verification"
            ]],
            authenticated: false,
            allowRefresh: false
        )
        return storeTokens(from: value)
    }

    func resendVerification(email: String) async throws {
        _ = try await requestValue(
            endpoint: "action",
            path: "auth:signIn",
            args: ["provider": "password", "params": [
                "email": email,
                "flow": "email-verification"
            ]],
            authenticated: false,
            allowRefresh: false
        )
    }

    func signOut() async {
        if accessToken != nil {
            _ = try? await requestValue(
                endpoint: "action",
                path: "auth:signOut",
                args: [:],
                authenticated: true,
                allowRefresh: false
            )
        }
        deleteKeychain("accessToken")
        deleteKeychain("refreshToken")
    }

    func query<T: Decodable>(_ path: String, args: [String: Any] = [:], as type: T.Type = T.self) async throws -> T {
        let data = try await requestValue(endpoint: "query", path: path, args: args, authenticated: true)
        return try JSONDecoder().decode(T.self, from: data)
    }

    func mutation(_ path: String, args: [String: Any] = [:]) async throws -> Data {
        try await requestValue(endpoint: "mutation", path: path, args: args, authenticated: true)
    }

    func actionVoid(_ path: String, args: [String: Any] = [:]) async throws {
        _ = try await requestValue(endpoint: "action", path: path, args: args, authenticated: true)
    }

    func action<T: Decodable>(_ path: String, args: [String: Any] = [:], as type: T.Type = T.self) async throws -> T {
        let data = try await requestValue(endpoint: "action", path: path, args: args, authenticated: true)
        return try JSONDecoder().decode(T.self, from: data)
    }

    private func requestValue(
        endpoint: String,
        path: String,
        args: [String: Any],
        authenticated: Bool,
        allowRefresh: Bool = true
    ) async throws -> Data {
        var request = URLRequest(url: deploymentURL.appendingPathComponent("api").appendingPathComponent(endpoint))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "path": path,
            "args": args,
            "format": "json"
        ])

        if authenticated, let accessToken {
            request.setValue("Bearer " + accessToken, forHTTPHeaderField: "Authorization")
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch let error as URLError {
            if BackendError.isConnectivityCode(error.code) {
                throw BackendError.networkUnavailable(error.localizedDescription)
            }
            throw error
        }
        guard let http = response as? HTTPURLResponse else {
            throw BackendError.networkUnavailable("No response from the server.")
        }
        guard (200..<300).contains(http.statusCode) else {
            if (500..<600).contains(http.statusCode) || http.statusCode == 408 || http.statusCode == 429 {
                throw BackendError.temporaryServerFailure(http.statusCode)
            }
            if http.statusCode == 401, authenticated {
                if allowRefresh, refreshToken != nil {
                    try await renewSession()
                    return try await requestValue(
                        endpoint: endpoint,
                        path: path,
                        args: args,
                        authenticated: true,
                        allowRefresh: false
                    )
                }
                deleteKeychain("accessToken")
                deleteKeychain("refreshToken")
                throw BackendError.authenticationRequired("Your session expired. Please sign in again.")
            }
            throw BackendError.message("The server returned HTTP " + String(http.statusCode) + ".")
        }
        guard let envelope = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw BackendError.message("Invalid response from the server.")
        }

        if envelope["status"] as? String == "error" {
            let message = envelope["errorMessage"] as? String ?? "Request failed."
            let lower = message.lowercased()
            let isAuthFailure = lower.contains("not authenticated") || lower.contains("token") || lower.contains("auth")
            if authenticated, isAuthFailure {
                if allowRefresh, refreshToken != nil {
                    try await renewSession()
                    return try await requestValue(
                        endpoint: endpoint,
                        path: path,
                        args: args,
                        authenticated: true,
                        allowRefresh: false
                    )
                }
                deleteKeychain("accessToken")
                deleteKeychain("refreshToken")
                throw BackendError.authenticationRequired(message)
            }
            throw BackendError.message(message)
        }

        guard envelope["status"] as? String == "success",
              let value = envelope["value"] else {
            throw BackendError.message("The server returned an empty response.")
        }
        return try JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed])
    }

    private func renewSession() async throws {
        do {
            guard let refreshToken else {
                throw BackendError.message("Your session expired. Please sign in again.")
            }
            let data = try await requestValue(
                endpoint: "action",
                path: "auth:signIn",
                args: ["refreshToken": refreshToken],
                authenticated: false,
                allowRefresh: false
            )
            guard storeTokens(from: data) else {
                throw BackendError.message("Your session expired. Please sign in again.")
            }
        } catch {
            if !BackendError.isRetryable(error) {
                deleteKeychain("accessToken")
                deleteKeychain("refreshToken")
                throw BackendError.authenticationRequired(error.localizedDescription)
            }
            throw error
        }
    }

    private func storeTokens(from valueData: Data) -> Bool {
        guard let result = try? JSONDecoder().decode(SignInResult.self, from: valueData),
              let tokens = result.tokens else { return false }
        writeKeychain(tokens.token, key: "accessToken")
        writeKeychain(tokens.refreshToken, key: "refreshToken")
        return true
    }

    private func readKeychain(_ key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private func writeKeychain(_ value: String, key: String) {
        deleteKeychain(key)
        var item: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecValueData as String: Data(value.utf8)
        ]
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(item as CFDictionary, nil)
    }

    private func deleteKeychain(_ key: String) {
        SecItemDelete([
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key
        ] as CFDictionary)
    }
}

private struct SignInResult: Decodable {
    let tokens: AuthTokens?
}

private struct AuthTokens: Decodable {
    let token: String
    let refreshToken: String
}

enum BackendError: LocalizedError {
    case message(String)
    case authenticationRequired(String)
    case networkUnavailable(String)
    case temporaryServerFailure(Int)

    var errorDescription: String? {
        switch self {
        case let .message(message), let .authenticationRequired(message):
            return message
        case let .networkUnavailable(message):
            return message
        case let .temporaryServerFailure(status):
            return "The server is temporarily unavailable (HTTP \(status))."
        }
    }

    static func isAuthenticationFailure(_ error: Error) -> Bool {
        if let backendError = error as? BackendError, case .authenticationRequired = backendError {
            return true
        }
        return false
    }

    static func isConnectivityCode(_ code: URLError.Code) -> Bool {
        switch code {
        case .notConnectedToInternet, .networkConnectionLost, .timedOut,
             .cannotFindHost, .cannotConnectToHost, .dnsLookupFailed,
             .dataNotAllowed, .internationalRoamingOff, .resourceUnavailable:
            return true
        default:
            return false
        }
    }

    static func isConnectivityFailure(_ error: Error) -> Bool {
        if let backendError = error as? BackendError, case .networkUnavailable = backendError {
            return true
        }
        if let urlError = error as? URLError {
            return isConnectivityCode(urlError.code)
        }
        return false
    }

    static func isRetryable(_ error: Error) -> Bool {
        if let backendError = error as? BackendError {
            switch backendError {
            case .networkUnavailable, .temporaryServerFailure:
                return true
            case .message, .authenticationRequired:
                return false
            }
        }
        return isConnectivityFailure(error)
    }
}
