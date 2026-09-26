import SwiftUI

struct AccountAccessView: View {
    @EnvironmentObject private var state: AppState

    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmation = ""
    @State private var verificationCode = ""
    @State private var isRegistration = false
    @State private var isSubmitting = false
    @State private var localError: String?

    var body: some View {
        ZStack {
            MeshGradientBackground()
            ScrollView {
                VStack(spacing: 24) {
                    VStack(spacing: 12) {
                        Image("AppLogo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 72, height: 72)
                            .clipShape(RoundedRectangle(cornerRadius: 20))
                        Text(state.isAwaitingEmailVerification ? "Verify your email" : "Welcome to Tekyida")
                            .font(.largeTitle.bold())
                            .foregroundStyle(.primary)
                        Text(state.isAwaitingEmailVerification
                             ? "Enter the 6-digit code we sent to \(email)."
                             : "Sign in to sync your notebooks and transactions.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 52)

                    VStack(spacing: 14) {
                        if state.isAwaitingEmailVerification {
                            HStack(spacing: 12) {
                                Image(systemName: "number")
                                    .foregroundColor(.secondary)
                                    .frame(width: 20)
                                TextField("6-digit verification code", text: $verificationCode)
                                    .keyboardType(.numberPad)
                                    .textContentType(.oneTimeCode)
                            }
                            .glassInputStyle(cornerRadius: AppTheme.radiusInput)

                            GlassButton("Verify email", systemImage: "checkmark.circle", style: .primary, size: .large) {
                                submit { await state.verifyEmail(email: email, code: verificationCode) }
                            }
                            .disabled(isSubmitting || verificationCode.isEmpty)
                            .opacity((isSubmitting || verificationCode.isEmpty) ? 0.45 : 1.0)

                            Button("Resend code") {
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                submit { await state.resendVerification(email: email) }
                            }
                            .buttonStyle(.plain)
                            Button("Back to sign in") {
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                state.isAwaitingEmailVerification = false
                                state.authError = nil
                            }
                            .buttonStyle(.plain)
                        } else {
                            if isRegistration {
                                HStack(spacing: 12) {
                                    Image(systemName: "person.fill")
                                        .foregroundColor(.secondary)
                                        .frame(width: 20)
                                    TextField("Name", text: $name)
                                        .textContentType(.name)
                                }
                                .glassInputStyle(cornerRadius: AppTheme.radiusInput)
                            }

                            HStack(spacing: 12) {
                                Image(systemName: "envelope.fill")
                                    .foregroundColor(.secondary)
                                    .frame(width: 20)
                                TextField("Email", text: $email)
                                    .textContentType(.emailAddress)
                                    .keyboardType(.emailAddress)
                                    .textInputAutocapitalization(.never)
                                    .autocorrectionDisabled()
                            }
                            .glassInputStyle(cornerRadius: AppTheme.radiusInput)

                            HStack(spacing: 12) {
                                Image(systemName: "lock.fill")
                                    .foregroundColor(.secondary)
                                    .frame(width: 20)
                                SecureField("Password", text: $password)
                                    .textContentType(isRegistration ? .newPassword : .password)
                            }
                            .glassInputStyle(cornerRadius: AppTheme.radiusInput)

                            if isRegistration {
                                HStack(spacing: 12) {
                                    Image(systemName: "lock.shield.fill")
                                        .foregroundColor(.secondary)
                                        .frame(width: 20)
                                    SecureField("Confirm password", text: $confirmation)
                                        .textContentType(.newPassword)
                                }
                                .glassInputStyle(cornerRadius: AppTheme.radiusInput)
                            }

                            GlassButton(
                                isRegistration ? "Create account" : "Sign in",
                                systemImage: isRegistration ? "person.badge.plus" : "arrow.right",
                                style: .primary,
                                size: .large
                            ) {
                                guard !isRegistration || password == confirmation else {
                                    localError = "Passwords do not match."
                                    return
                                }
                                guard !isRegistration || password.count >= 8 else {
                                    localError = "Password must be at least 8 characters."
                                    return
                                }
                                localError = nil
                                submit {
                                    await state.signIn(
                                        email: email,
                                        password: password,
                                        name: isRegistration ? name : nil,
                                        isRegistration: isRegistration
                                    )
                                }
                            }
                            .disabled(isSubmitting || email.isEmpty || password.isEmpty)
                            .opacity((isSubmitting || email.isEmpty || password.isEmpty) ? 0.45 : 1.0)

                            Button(isRegistration ? "I already have an account" : "Create an account") {
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                isRegistration.toggle()
                                localError = nil
                                state.authError = nil
                            }
                            .buttonStyle(.plain)
                        }

                        if isSubmitting { ProgressView().tint(AppTheme.primary) }
                        if let message = localError ?? state.authError {
                            Text(message)
                                .font(.footnote)
                                .foregroundStyle(AppTheme.danger)
                                .multilineTextAlignment(.center)
                        }
                    }
                    .padding(20)
                    .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
                    .padding(.horizontal, 20)
                    Spacer(minLength: 32)
                }
                .frame(maxWidth: 520)
                .frame(maxWidth: .infinity)
            }
        }
    }

    private func submit(_ action: @escaping () async -> Void) {
        guard !isSubmitting else { return }
        isSubmitting = true
        Task {
            await action()
            isSubmitting = false
        }
    }
}
