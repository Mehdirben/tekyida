import Foundation
@testable import Tekyida

/// Scriptable in-memory fake for `BackendAPI`. Records every call and lets
/// each test script per-path results or errors.
@MainActor
final class MockBackend: BackendAPI {
    // MARK: Scripted behavior

    var hasSession = false
    var signInResult: Result<Bool, Error> = .success(true)
    var verifyEmailResult: Result<Bool, Error> = .success(true)
    var resendVerificationError: Error?
    var queryResults: [String: Result<Data, Error>] = [:]
    var mutationResults: [String: Result<Data, Error>] = [:]
    var actionVoidResults: [String: Error] = [:]
    var actionResults: [String: Result<Data, Error>] = [:]
    var defaultQueryResult: Result<Data, Error> = .success(Data("null".utf8))
    var defaultMutationResult: Result<Data, Error> = .success(Data("null".utf8))

    // MARK: Recorded calls

    struct SignInCall: Equatable {
        let email: String
        let password: String
        let name: String?
        let flow: String
    }

    private(set) var signInCalls: [SignInCall] = []
    private(set) var verifyEmailCalls: [(email: String, code: String)] = []
    private(set) var resendVerificationCalls: [String] = []
    private(set) var signOutCount = 0
    private(set) var queryCalls: [(path: String, args: [String: Any])] = []
    private(set) var mutationCalls: [(path: String, args: [String: Any])] = []
    private(set) var actionVoidCalls: [(path: String, args: [String: Any])] = []

    // MARK: BackendAPI

    func signIn(email: String, password: String, name: String?, flow: String) async throws -> Bool {
        signInCalls.append(SignInCall(email: email, password: password, name: name, flow: flow))
        return try signInResult.get()
    }

    func verifyEmail(email: String, code: String) async throws -> Bool {
        verifyEmailCalls.append((email, code))
        return try verifyEmailResult.get()
    }

    func resendVerification(email: String) async throws {
        resendVerificationCalls.append(email)
        if let resendVerificationError { throw resendVerificationError }
    }

    func signOut() async {
        signOutCount += 1
    }

    func query<T: Decodable>(_ path: String, args: [String: Any]) async throws -> T {
        queryCalls.append((path, args))
        let result = queryResults[path] ?? defaultQueryResult
        let data = try result.get()
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw BackendError.message("MockBackend decode failure for \(path): \(error.localizedDescription)")
        }
    }

    func mutation(_ path: String, args: [String: Any]) async throws -> Data {
        mutationCalls.append((path, args))
        return try (mutationResults[path] ?? defaultMutationResult).get()
    }

    func actionVoid(_ path: String, args: [String: Any]) async throws {
        actionVoidCalls.append((path, args))
        if let error = actionVoidResults[path] { throw error }
    }

    func action<T: Decodable>(_ path: String, args: [String: Any]) async throws -> T {
        let result = actionResults[path] ?? .success(Data("null".utf8))
        let data = try result.get()
        return try JSONDecoder().decode(T.self, from: data)
    }

    // MARK: Scripting helpers

    func setQuery<T: Encodable>(_ path: String, value: T) throws {
        queryResults[path] = .success(try JSONEncoder().encode(value))
    }

    func setQueryJSON(_ path: String, _ jsonString: String) {
        queryResults[path] = .success(Data(jsonString.utf8))
    }

    func setQueryError(_ path: String, _ error: Error) {
        queryResults[path] = .failure(error)
    }

    func setMutation<T: Encodable>(_ path: String, value: T) throws {
        mutationResults[path] = .success(try JSONEncoder().encode(value))
    }

    func setMutationJSON(_ path: String, _ jsonString: String) {
        mutationResults[path] = .success(Data(jsonString.utf8))
    }

    func setMutationError(_ path: String, _ error: Error) {
        mutationResults[path] = .failure(error)
    }

    func clearRecordedCalls() {
        signInCalls = []
        verifyEmailCalls = []
        resendVerificationCalls = []
        signOutCount = 0
        queryCalls = []
        mutationCalls = []
        actionVoidCalls = []
    }
}

/// Generic test error distinct from `BackendError` so classifiers can be
/// exercised against non-backend failures.
struct TestError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

extension MockBackend {
    /// Scripts empty lists and a current email so `refreshData` completes
    /// cleanly after mutations without each test re-scripting every query.
    func seedDefaultRefreshData(email: String = "user@tekyida.app") throws {
        try setQuery("notebooks:list", value: [Notebook]())
        try setQuery("contacts:list", value: [Contact]())
        try setQuery("experiences:list", value: [Experience]())
        try setQuery("transactions:list", value: [Transaction]())
        setQueryJSON("users:currentEmail", "\"\(email)\"")
    }
}
