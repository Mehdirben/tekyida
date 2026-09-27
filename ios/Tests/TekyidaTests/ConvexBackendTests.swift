import Testing
import Foundation
@testable import Tekyida

// Serialized: URLProtocolStub uses one static handler shared by all tests.
@Suite("ConvexBackend Networking", .serialized)
@MainActor
struct ConvexBackendTests {
    private final class RequestRecorder: @unchecked Sendable {
        private let lock = NSLock()
        private var storage: [URLRequest] = []
        var requests: [URLRequest] {
            lock.withLock { storage }
        }
        var count: Int { requests.count }
        func append(_ request: URLRequest) {
            lock.withLock { storage.append(request) }
        }
    }

    private let tokens = InMemoryTokenStore()
    private let backend: ConvexBackend

    init() {
        backend = ConvexBackend(session: URLProtocolStub.makeSession(), tokenStore: tokens)
    }

    @Test("Query posts the Convex envelope and decodes the value")
    func queryEnvelopeAndDecode() async throws {
        let recorder = RequestRecorder()
        URLProtocolStub.handler = { request in
            recorder.append(request)
            return .init(
                status: 200,
                body: Data(#"{"status":"success","value":[{"_id":"nb1","name":"A","createdAt":1700000000000}]}"#.utf8)
            )
        }
        let notebooks: [Notebook] = try await backend.query("notebooks:list", args: ["active": true])
        #expect(notebooks.count == 1)
        #expect(notebooks.first?.id == "nb1")

        let sent = try #require(recorder.requests.first)
        let body = try #require(try JSONSerialization.jsonObject(with: sent.bodyData ?? Data()) as? [String: Any])
        #expect(body["path"] as? String == "notebooks:list")
        #expect(body["format"] as? String == "json")
        let args = try #require(body["args"] as? [String: Any])
        #expect(args["active"] as? Bool == true)
    }

    @Test("Authenticated requests attach the bearer token")
    func authorizationHeader() async throws {
        tokens.write("tok_123", key: "accessToken")
        let recorder = RequestRecorder()
        URLProtocolStub.handler = { request in
            recorder.append(request)
            return .init(status: 200, body: Data(#"{"status":"success","value":"user@x.com"}"#.utf8))
        }
        let email: String? = try await backend.query("users:currentEmail", args: [:])
        #expect(email == "user@x.com")
        let sent = try #require(recorder.requests.first)
        #expect(sent.value(forHTTPHeaderField: "Authorization") == "Bearer tok_123")
        #expect(sent.httpMethod == "POST")
        #expect(sent.url?.path.hasSuffix("/api/query") == true)

        let body = try #require(try JSONSerialization.jsonObject(with: sent.bodyData ?? Data()) as? [String: Any])
        #expect(body["path"] as? String == "users:currentEmail")
        #expect(body["format"] as? String == "json")
    }

    @Test("401 with a refresh token renews the session and retries")
    func refreshFlowOn401() async throws {
        tokens.write("expired", key: "accessToken")
        tokens.write("refresh-1", key: "refreshToken")
        let recorder = RequestRecorder()
        URLProtocolStub.handler = { request in
            recorder.append(request)
            let body = (try? JSONSerialization.jsonObject(with: request.bodyData ?? Data())) as? [String: Any]
            if body?["path"] as? String == "auth:signIn" {
                return .init(
                    status: 200,
                    body: Data(#"{"status":"success","value":{"tokens":{"token":"newAccess","refreshToken":"newRefresh"}}}"#.utf8)
                )
            }
            if recorder.count == 1 {
                return .init(status: 401, body: Data())
            }
            return .init(status: 200, body: Data(#"{"status":"success","value":[]}"#.utf8))
        }

        let notebooks: [Notebook] = try await backend.query("notebooks:list", args: [:])
        #expect(notebooks.isEmpty)
        #expect(recorder.count == 3, "original + refresh + retried request")
        #expect(tokens.read("accessToken") == "newAccess")
        #expect(tokens.read("refreshToken") == "newRefresh")

        let retried = recorder.requests[2]
        #expect(retried.value(forHTTPHeaderField: "Authorization") == "Bearer newAccess")
    }

    @Test("401 without a refresh token throws authenticationRequired and clears tokens")
    func fortyOneWithoutRefresh() async {
        tokens.write("expired", key: "accessToken")
        URLProtocolStub.handler = { _ in .init(status: 401, body: Data()) }

        await #expect {
            let _: [Notebook] = try await backend.query("notebooks:list", args: [:])
        } throws: { error in
            BackendError.isAuthenticationFailure(error)
        }
        #expect(tokens.read("accessToken") == nil, "tokens must be cleared after terminal 401")
    }

    @Test("Envelope auth-error message triggers authenticationRequired")
    func envelopeAuthError() async {
        URLProtocolStub.handler = { _ in
            .init(status: 200, body: Data(#"{"status":"error","errorMessage":"Not authenticated"}"#.utf8))
        }
        await #expect {
            let _: [Notebook] = try await backend.query("notebooks:list", args: [:])
        } throws: { error in
            BackendError.isAuthenticationFailure(error) && error.localizedDescription.contains("Not authenticated")
        }
    }

    @Test("Server errors map to temporaryServerFailure")
    func serverFailureClassification() async {
        URLProtocolStub.handler = { _ in .init(status: 503, body: Data()) }
        await #expect {
            let _: [Notebook] = try await backend.query("notebooks:list", args: [:])
        } throws: { error in
            guard let backendError = error as? BackendError,
                  case .temporaryServerFailure(503) = backendError else { return false }
            return BackendError.isRetryable(error)
        }
    }

    @Test("Transport failures map to networkUnavailable (connectivity)")
    func transportFailureClassification() async {
        URLProtocolStub.handler = { _ in nil }
        await #expect {
            let _: [Notebook] = try await backend.query("notebooks:list", args: [:])
        } throws: { error in
            BackendError.isConnectivityFailure(error) && BackendError.isRetryable(error)
        }
    }

    @Test("Generic envelope errors surface the server message")
    func genericEnvelopeError() async {
        URLProtocolStub.handler = { _ in
            .init(status: 200, body: Data(#"{"status":"error","errorMessage":"Notebook name taken"}"#.utf8))
        }
        await #expect {
            let _: [Notebook] = try await backend.query("notebooks:list", args: [:])
        } throws: { error in
            error.localizedDescription == "Notebook name taken" && !BackendError.isRetryable(error)
        }
    }

    @Test("Non-object JSON body produces an invalid-response error")
    func invalidResponseBody() async {
        URLProtocolStub.handler = { _ in .init(status: 200, body: Data("[1,2,3]".utf8)) }
        await #expect {
            let _: [Notebook] = try await backend.query("notebooks:list", args: [:])
        } throws: { error in
            error.localizedDescription == "Invalid response from the server."
        }
    }

    @Test("Success envelope without a value produces an empty-response error")
    func emptyEnvelopeValue() async {
        URLProtocolStub.handler = { _ in .init(status: 200, body: Data(#"{"status":"success"}"#.utf8)) }
        await #expect {
            let _: [Notebook] = try await backend.query("notebooks:list", args: [:])
        } throws: { error in
            error.localizedDescription == "The server returned an empty response."
        }
    }

    @Test("signIn stores tokens and reports success")
    func signInStoresTokens() async throws {
        URLProtocolStub.handler = { request in
            let body = (try? JSONSerialization.jsonObject(with: request.bodyData ?? Data())) as? [String: Any]
            #expect(body?["path"] as? String == "auth:signIn")
            return .init(
                status: 200,
                body: Data(#"{"status":"success","value":{"tokens":{"token":"access_1","refreshToken":"refresh_1"}}}"#.utf8)
            )
        }
        let signedIn = try await backend.signIn(email: "a@b.com", password: "secret", name: "Alice", flow: "signUp")
        #expect(signedIn)
        #expect(tokens.read("accessToken") == "access_1")
        #expect(tokens.read("refreshToken") == "refresh_1")
        #expect(backend.hasSession)
    }

    @Test("signIn without tokens reports failure")
    func signInWithoutTokens() async throws {
        URLProtocolStub.handler = { _ in
            .init(status: 200, body: Data(#"{"status":"success","value":{}}"#.utf8))
        }
        let signedIn = try await backend.signIn(email: "a@b.com", password: "secret", flow: "signIn")
        #expect(!signedIn)
        #expect(!backend.hasSession)
    }

    @Test("signOut clears stored tokens")
    func signOutClearsTokens() async {
        tokens.write("access_1", key: "accessToken")
        tokens.write("refresh_1", key: "refreshToken")
        URLProtocolStub.handler = { _ in
            .init(status: 200, body: Data(#"{"status":"success","value":null}"#.utf8))
        }
        await backend.signOut()
        #expect(tokens.read("accessToken") == nil)
        #expect(tokens.read("refreshToken") == nil)
        #expect(!backend.hasSession)
    }

    @Test("actionVoid posts to the action endpoint")
    func actionVoidPosts() async throws {
        let recorder = RequestRecorder()
        URLProtocolStub.handler = { request in
            recorder.append(request)
            return .init(status: 200, body: Data(#"{"status":"success","value":null}"#.utf8))
        }
        try await backend.actionVoid("users:changePassword", args: ["currentPassword": "a", "newPassword": "b"])
        let sent = try #require(recorder.requests.first)
        #expect(sent.url?.path.hasSuffix("/api/action") == true)
    }

    // MARK: - Email verification flows

    @Test("verifyEmail posts the code and stores tokens on acceptance")
    func verifyEmailStoresTokens() async throws {
        URLProtocolStub.handler = { request in
            let body = (try? JSONSerialization.jsonObject(with: request.bodyData ?? Data())) as? [String: Any]
            let params = (body?["args"] as? [String: Any])?["params"] as? [String: Any]
            #expect(params?["flow"] as? String == "email-verification")
            #expect(params?["code"] as? String == "654321")
            return .init(
                status: 200,
                body: Data(#"{"status":"success","value":{"tokens":{"token":"verify_access","refreshToken":"verify_refresh"}}}"#.utf8)
            )
        }
        let accepted = try await backend.verifyEmail(email: "user@tekyida.app", code: "654321")
        #expect(accepted)
        #expect(tokens.read("accessToken") == "verify_access")
    }

    @Test("verifyEmail reports rejection without tokens")
    func verifyEmailRejected() async throws {
        URLProtocolStub.handler = { _ in
            .init(status: 200, body: Data(#"{"status":"success","value":{}}"#.utf8))
        }
        let accepted = try await backend.verifyEmail(email: "user@tekyida.app", code: "000000")
        #expect(!accepted)
    }

    @Test("resendVerification posts and ignores the value")
    func resendVerificationPosts() async throws {
        let recorder = RequestRecorder()
        URLProtocolStub.handler = { request in
            recorder.append(request)
            return .init(status: 200, body: Data(#"{"status":"success","value":null}"#.utf8))
        }
        try await backend.resendVerification(email: "user@tekyida.app")
        let sent = try #require(recorder.requests.first)
        let body = try #require(try JSONSerialization.jsonObject(with: sent.bodyData ?? Data()) as? [String: Any])
        let params = try #require((body["args"] as? [String: Any])?["params"] as? [String: Any])
        #expect(params["email"] as? String == "user@tekyida.app")
        #expect(params["flow"] as? String == "email-verification")
    }

    // MARK: - Envelope-error refresh path

    @Test("Envelope auth error with a refresh token renews and retries")
    func envelopeAuthErrorRefreshesAndRetries() async throws {
        tokens.write("stale", key: "accessToken")
        tokens.write("refresh-1", key: "refreshToken")
        let recorder = RequestRecorder()
        URLProtocolStub.handler = { request in
            recorder.append(request)
            let body = (try? JSONSerialization.jsonObject(with: request.bodyData ?? Data())) as? [String: Any]
            if body?["path"] as? String == "auth:signIn" {
                return .init(
                    status: 200,
                    body: Data(#"{"status":"success","value":{"tokens":{"token":"freshAccess","refreshToken":"freshRefresh"}}}"#.utf8)
                )
            }
            if recorder.count == 1 {
                return .init(status: 200, body: Data(#"{"status":"error","errorMessage":"Not authenticated"}"#.utf8))
            }
            return .init(status: 200, body: Data(#"{"status":"success","value":[]}"#.utf8))
        }

        let notebooks: [Notebook] = try await backend.query("notebooks:list", args: [:])
        #expect(notebooks.isEmpty)
        #expect(recorder.count == 3, "original + token refresh + retried query")
        #expect(tokens.read("accessToken") == "freshAccess")
    }

    @Test("A token refresh that returns no tokens signs the session out")
    func refreshWithoutTokensSignsOut() async {
        tokens.write("stale", key: "accessToken")
        tokens.write("refresh-1", key: "refreshToken")
        URLProtocolStub.handler = { request in
            let body = (try? JSONSerialization.jsonObject(with: request.bodyData ?? Data())) as? [String: Any]
            if body?["path"] as? String == "auth:signIn" {
                // Successful envelope, but no tokens inside → storeTokens fails.
                return .init(status: 200, body: Data(#"{"status":"success","value":{}}"#.utf8))
            }
            return .init(status: 401, body: Data())
        }

        await #expect {
            let _: [Notebook] = try await backend.query("notebooks:list", args: [:])
        } throws: { error in
            BackendError.isAuthenticationFailure(error)
        }
        #expect(tokens.read("accessToken") == nil, "cleared after a failed renewal")
        #expect(tokens.read("refreshToken") == nil)
    }
}
