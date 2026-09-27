import Testing
import Foundation
@testable import Tekyida

@Suite("AppState Authentication")
@MainActor
struct AppStateAuthTests {
    private let backend: MockBackend
    private let state: AppState

    init() throws {
        backend = MockBackend()
        state = TestSupport.makeState(backend: backend)
        try backend.seedDefaultRefreshData()
    }

    @Test("Sign in completes the session with a normalized email")
    func signInSuccess() async {
        backend.signInResult = .success(true)

        await state.signIn(email: "  User@Tekyida.App ", password: "secret")

        #expect(state.isAuthenticated)
        #expect(state.userEmail == "user@tekyida.app")
        #expect(state.authError == nil)
        #expect(!state.isAwaitingEmailVerification)
        #expect(backend.signInCalls.first?.flow == "signIn")
        #expect(backend.signInCalls.first?.email == "User@Tekyida.App", "whitespace trimmed, case preserved")
        #expect(!state.isLoading, "restoreSession must clear the loading flag")
    }

    @Test("Registration uses the signUp flow")
    func signInRegistrationFlow() async {
        backend.signInResult = .success(true)

        await state.signIn(email: "new@tekyida.app", password: "secret", isRegistration: true)

        #expect(backend.signInCalls.first?.flow == "signUp")
        #expect(state.isAuthenticated)
    }

    @Test("Sign in with pending changes of another account is refused")
    func signInBlockedByForeignQueue() async {
        state.pendingMutations = [QueuedMutation(
            functionPath: "contacts:create",
            arguments: Data("{}".utf8),
            localCreatedId: nil,
            accountEmail: "other@tekyida.app"
        )]

        await state.signIn(email: "user@tekyida.app", password: "secret")

        #expect(state.authError?.contains("offline changes") == true)
        #expect(backend.signInCalls.isEmpty, "the backend must not be contacted")
        #expect(!state.isAuthenticated)
    }

    @Test("Sign in without tokens enters email-verification wait")
    func signInAwaitingVerification() async {
        backend.signInResult = .success(false)

        await state.signIn(email: "user@tekyida.app", password: "secret")

        #expect(state.isAwaitingEmailVerification)
        #expect(!state.isAuthenticated)
    }

    @Test("Sign in errors surface the localized description")
    func signInSurfacesError() async {
        backend.signInResult = .failure(BackendError.message("Wrong password"))

        await state.signIn(email: "user@tekyida.app", password: "wrong")

        #expect(state.authError == "Wrong password")
        #expect(!state.isAuthenticated)
    }

    @Test("Email verification completes the session")
    func verifyEmailFlows() async {
        backend.verifyEmailResult = .success(true)
        await state.verifyEmail(email: "user@tekyida.app", code: " 123456 ")
        #expect(state.isAuthenticated)
        #expect(!state.isAwaitingEmailVerification)
        #expect(backend.verifyEmailCalls.first?.code == "123456", "codes are trimmed")
    }

    @Test("Rejected verification codes surface an error")
    func verifyEmailRejected() async {
        backend.verifyEmailResult = .success(false)

        await state.verifyEmail(email: "user@tekyida.app", code: "000000")

        #expect(state.authError?.contains("not accepted") == true)
        #expect(!state.isAuthenticated)
    }

    @Test("Resend verification errors are surfaced")
    func resendVerificationError() async {
        backend.resendVerificationError = BackendError.message("Too many requests")

        await state.resendVerification(email: "user@tekyida.app")

        #expect(state.authError == "Too many requests")
        #expect(backend.resendVerificationCalls == ["user@tekyida.app"])
    }

    @Test("Sign out with pending changes is blocked")
    func signOutBlockedByPending() async {
        state.isAuthenticated = true
        state.pendingMutations = [QueuedMutation(
            functionPath: "contacts:create",
            arguments: Data("{}".utf8),
            localCreatedId: nil,
            accountEmail: "user@tekyida.app"
        )]

        await state.signOut()

        #expect(state.isAuthenticated, "must stay signed in until synced")
        #expect(state.appError?.contains("Reconnect") == true)
        #expect(backend.signOutCount == 0)
    }

    @Test("Sign out clears the session and cached data")
    func signOutClearsEverything() async {
        state.isAuthenticated = true
        state.userEmail = "user@tekyida.app"
        state.notebooks = [Notebook(id: "nb1", name: "Main")]
        state.contacts = [Contact(id: "c1", notebookId: "nb1", name: "Alice")]
        state.defaults.set("nb1", forKey: "tekyida_active_notebook_id")

        await state.signOut()

        #expect(!state.isAuthenticated)
        #expect(state.notebooks.isEmpty)
        #expect(state.contacts.isEmpty)
        #expect(state.userEmail.isEmpty)
        #expect(state.defaults.string(forKey: "tekyida_active_notebook_id") == nil)
        #expect(backend.signOutCount == 1)
    }

    @Test("changeEmail updates the account online and persists the snapshot")
    func changeEmailOnline() async throws {
        backend.setQueryJSON("users:currentEmail", "\"New@Tekyida.App\"")

        try await state.changeEmail(to: " new@tekyida.app ")

        #expect(backend.actionVoidCalls.first?.path == "users:changeEmail")
        #expect(backend.actionVoidCalls.first?.args["newEmail"] as? String == "new@tekyida.app")
        #expect(state.userEmail == "new@tekyida.app", "email comes from the server query, normalized")
    }

    @Test("changeEmail and changePassword require online and an empty queue")
    func changeCredentialsGuards() async {
        state.isOnline = false
        #expect {
            try await state.changeEmail(to: "a@b.com")
        } throws: { $0.localizedDescription.contains("offline") }
        #expect {
            try await state.changePassword(current: "a", new: "b")
        } throws: { $0.localizedDescription.contains("offline") }

        state.isOnline = true
        state.pendingMutations = [QueuedMutation(
            functionPath: "contacts:create",
            arguments: Data("{}".utf8),
            localCreatedId: nil,
            accountEmail: "user@tekyida.app"
        )]
        #expect {
            try await state.changeEmail(to: "a@b.com")
        } throws: { $0.localizedDescription.contains("pending offline changes") }
        #expect(backend.actionVoidCalls.isEmpty)
    }

    @Test("changePassword posts both passwords online")
    func changePasswordOnline() async {
        try? await state.changePassword(current: "oldpass", new: "newpass")

        #expect(backend.actionVoidCalls.first?.path == "users:changePassword")
        #expect(backend.actionVoidCalls.first?.args["currentPassword"] as? String == "oldpass")
        #expect(backend.actionVoidCalls.first?.args["newPassword"] as? String == "newpass")
    }

    @Test("restoreSession survives retryable connectivity failures")
    func restoreSessionRetryable() async {
        backend.hasSession = true
        backend.setQueryError("notebooks:list", BackendError.networkUnavailable("Airplane mode"))

        await state.restoreSession()

        #expect(state.isAuthenticated, "retryable failures must keep the session")
        #expect(state.isOnline == false)
        #expect(state.appError == nil)
        #expect(!state.isLoading)
    }

    @Test("restoreSession keeps the session with an app error on fatal failures")
    func restoreSessionFatalWithSession() async {
        backend.hasSession = true
        backend.setQueryError("notebooks:list", BackendError.message("Token rejected"))

        await state.restoreSession()

        #expect(state.isAuthenticated)
        #expect(state.appError == "Token rejected")
    }

    @Test("restoreSession signs out on fatal failures without a session")
    func restoreSessionFatalWithoutSession() async {
        backend.hasSession = false
        backend.setQueryError("notebooks:list", BackendError.message("Token rejected"))

        await state.restoreSession()

        #expect(!state.isAuthenticated)
        #expect(state.authError == "Token rejected")
    }

    @Test("Switching accounts clears cached data from the previous account")
    func finishSignInSwitchesAccounts() async {
        state.userEmail = "old@tekyida.app"
        state.notebooks = [Notebook(id: "nb1", name: "Old Account Data")]

        await state.finishSignIn(accountEmail: "new@tekyida.app")

        #expect(state.userEmail == "new@tekyida.app")
        #expect(state.isAuthenticated)
        #expect(state.notebooks.isEmpty, "previous account data must not leak")
    }
}
