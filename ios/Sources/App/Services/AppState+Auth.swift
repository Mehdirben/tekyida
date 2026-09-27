import Foundation

// MARK: - Authentication and Account Session
extension AppState {
    public func signIn(email: String, password: String, name: String? = nil, isRegistration: Bool = false) async {
        authError = nil
        let account = normalizedEmail(email)
        if let owner = pendingMutations.first?.accountEmail, normalizedEmail(owner) != account {
            authError = "There are offline changes waiting for another account. Sign in with that account and sync first."
            return
        }
        do {
            let signedIn = try await backend.signIn(
                email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                password: password,
                name: name,
                flow: isRegistration ? "signUp" : "signIn"
            )
            if signedIn {
                isAwaitingEmailVerification = false
                await finishSignIn(accountEmail: account)
            } else {
                isAwaitingEmailVerification = true
            }
        } catch {
            authError = error.localizedDescription
        }
    }

    public func verifyEmail(email: String, code: String) async {
        authError = nil
        let account = normalizedEmail(email)
        if let owner = pendingMutations.first?.accountEmail, normalizedEmail(owner) != account {
            authError = "There are offline changes waiting for another account. Sign in with that account and sync first."
            return
        }
        do {
            guard try await backend.verifyEmail(
                email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                code: code.trimmingCharacters(in: .whitespacesAndNewlines)
            ) else {
                throw BackendError.message("The verification code was not accepted.")
            }
            isAwaitingEmailVerification = false
            await finishSignIn(accountEmail: account)
        } catch {
            authError = error.localizedDescription
        }
    }

    public func resendVerification(email: String) async {
        authError = nil
        do {
            try await backend.resendVerification(
                email: email.trimmingCharacters(in: .whitespacesAndNewlines)
            )
        } catch {
            authError = error.localizedDescription
        }
    }

    public func signOut() async {
        guard pendingMutations.isEmpty else {
            appError = "Reconnect and let pending offline changes sync before signing out."
            return
        }
        await backend.signOut()
        isAuthenticated = false
        isAwaitingEmailVerification = false
        authError = nil
        appError = nil
        clearCachedAccountData()
    }

    public func changeEmail(to email: String) async throws {
        guard isOnline else {
            throw BackendError.message("Cannot change email while offline.")
        }
        guard pendingMutations.isEmpty else {
            throw BackendError.message("Sync pending offline changes before changing the account email.")
        }
        let requestedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        try await backend.actionVoid("users:changeEmail", args: ["newEmail": requestedEmail])
        let updatedEmail: String? = try await backend.query("users:currentEmail", args: [:])
        userEmail = normalizedEmail(updatedEmail ?? requestedEmail)
        persistOfflineSnapshot()
    }

    public func changePassword(current: String, new: String) async throws {
        guard isOnline else {
            throw BackendError.message("Cannot change password while offline.")
        }
        try await backend.actionVoid(
            "users:changePassword",
            args: ["currentPassword": current, "newPassword": new]
        )
    }

    func finishSignIn(accountEmail: String) async {
        if !userEmail.isEmpty && normalizedEmail(userEmail) != accountEmail && pendingMutations.isEmpty {
            clearCachedAccountData()
        }
        userEmail = accountEmail
        isAuthenticated = true
        isLoading = true
        await restoreSession()
    }

    func restoreSession() async {
        do {
            try await refreshData()
            isAuthenticated = true
            appError = nil
            if !pendingMutations.isEmpty { await syncPendingMutations() }
        } catch {
            if BackendError.isRetryable(error) {
                if BackendError.isConnectivityFailure(error) { isOnline = false }
                isAuthenticated = true
                appError = nil
            } else if backend.hasSession {
                isAuthenticated = true
                appError = error.localizedDescription
            } else {
                isAuthenticated = false
                authError = error.localizedDescription
                // Keep local data and queued writes so this account can recover them later.
            }
        }
        isLoading = false
    }
}
