import Testing
import Foundation
@testable import Tekyida

@Suite("BackendError Classification")
struct BackendErrorTests {
    @Test("isAuthenticationFailure detects only authenticationRequired")
    func authenticationFailureDetection() {
        #expect(BackendError.isAuthenticationFailure(BackendError.authenticationRequired("Session expired")))
        #expect(!BackendError.isAuthenticationFailure(BackendError.message("Nope")))
        #expect(!BackendError.isAuthenticationFailure(BackendError.networkUnavailable("Offline")))
        #expect(!BackendError.isAuthenticationFailure(BackendError.temporaryServerFailure(503)))
        #expect(!BackendError.isAuthenticationFailure(URLError(.timedOut)))
        #expect(!BackendError.isAuthenticationFailure(TestError(message: "other")))
    }

    @Test("isConnectivityCode classifies network error codes", arguments: [
        URLError.Code.notConnectedToInternet,
        .networkConnectionLost,
        .timedOut,
        .cannotFindHost,
        .cannotConnectToHost,
        .dnsLookupFailed,
        .dataNotAllowed,
        .internationalRoamingOff,
        .resourceUnavailable
    ])
    func connectivityCodes(code: URLError.Code) {
        #expect(BackendError.isConnectivityCode(code))
    }

    @Test("Non-connectivity error codes are not classified as connectivity", arguments: [
        URLError.Code.badURL,
        .unsupportedURL,
        .zeroByteResource,
        .httpTooManyRedirects
    ])
    func nonConnectivityCodes(code: URLError.Code) {
        #expect(!BackendError.isConnectivityCode(code))
    }

    @Test("isConnectivityFailure detects networkUnavailable and raw URLErrors")
    func connectivityFailureDetection() {
        #expect(BackendError.isConnectivityFailure(BackendError.networkUnavailable("Offline")))
        #expect(BackendError.isConnectivityFailure(URLError(.timedOut)))
        #expect(!BackendError.isConnectivityFailure(BackendError.message("Nope")))
        #expect(!BackendError.isConnectivityFailure(BackendError.temporaryServerFailure(500)))
        #expect(!BackendError.isConnectivityFailure(URLError(.badURL)))
        #expect(!BackendError.isConnectivityFailure(TestError(message: "other")))
    }

    @Test("isRetryable marks connectivity and server failures retryable")
    func retryableDetection() {
        #expect(BackendError.isRetryable(BackendError.networkUnavailable("Offline")))
        #expect(BackendError.isRetryable(BackendError.temporaryServerFailure(503)))
        #expect(BackendError.isRetryable(URLError(.notConnectedToInternet)))
        #expect(!BackendError.isRetryable(BackendError.message("Validation failed")))
        #expect(!BackendError.isRetryable(BackendError.authenticationRequired("Expired")))
        #expect(!BackendError.isRetryable(TestError(message: "other")))
    }

    @Test("Human-readable descriptions for every case")
    func errorDescriptions() {
        #expect(BackendError.message("Boom").errorDescription == "Boom")
        #expect(BackendError.authenticationRequired("Again").errorDescription == "Again")
        #expect(BackendError.networkUnavailable("Offline").errorDescription == "Offline")
        #expect(BackendError.temporaryServerFailure(502).errorDescription == "The server is temporarily unavailable (HTTP 502).")
    }
}
