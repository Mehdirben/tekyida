import Foundation
@testable import Tekyida

/// In-memory `TokenStore` fake so backend tests never touch the Keychain.
final class InMemoryTokenStore: TokenStore {
    private var storage: [String: String] = [:]

    func read(_ key: String) -> String? { storage[key] }
    func write(_ value: String, key: String) { storage[key] = value }
    func delete(_ key: String) { storage.removeValue(forKey: key) }

    var hasTokens: Bool { !storage.isEmpty }
}

/// Intercepting `URLProtocol` for driving the real `ConvexBackend` networking
/// path (request envelope, 401 refresh flow, error classification) without
/// touching the network.
final class URLProtocolStub: URLProtocol {
    struct Response {
        let status: Int
        let headers: [String: String]
        let body: Data

        init(status: Int, body: Data = Data(), headers: [String: String] = [:]) {
            self.status = status
            self.body = body
            self.headers = headers
        }
    }

    private static let lock = NSLock()
    private static var handlerStorage: ((URLRequest) -> Response?)?
    static var handler: ((URLRequest) -> Response?)? {
        get { lock.withLock { handlerStorage } }
        set { lock.withLock { handlerStorage = newValue } }
    }

    static func reset() {
        handler = nil
    }

    /// Ephemeral session wired to this stub for `ConvexBackend(session:)`.
    static func makeSession() -> URLSession {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [URLProtocolStub.self]
        return URLSession(configuration: configuration)
    }

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let handler = URLProtocolStub.handler, let url = request.url else {
            client?.urlProtocol(self, didFailWithError: URLError(.badServerResponse))
            return
        }
        guard let response = handler(request) else {
            client?.urlProtocol(self, didFailWithError: URLError(.notConnectedToInternet))
            return
        }
        let http = HTTPURLResponse(
            url: url,
            statusCode: response.status,
            httpVersion: "HTTP/1.1",
            headerFields: response.headers
        )!
        client?.urlProtocol(self, didReceive: http, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: response.body)
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}
}

extension URLRequest {
    /// `URLSession` moves `httpBody` into `httpBodyStream` for async requests;
    /// this reads either so tests can inspect the outgoing envelope.
    var bodyData: Data? {
        if let httpBody { return httpBody }
        guard let stream = httpBodyStream else { return nil }
        stream.open()
        defer { stream.close() }
        var data = Data()
        let bufferSize = 4096
        let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: bufferSize)
        defer { buffer.deallocate() }
        while stream.hasBytesAvailable {
            let read = stream.read(buffer, maxLength: bufferSize)
            if read <= 0 { break }
            data.append(buffer, count: read)
        }
        return data
    }
}
