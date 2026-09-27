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
                        Text(state.isAwaitingEmailVerification ? tr("auth.verifyTitle") : tr("auth.welcome"))
                            .font(.largeTitle.bold())
                            .foregroundStyle(.primary)
                        Text(state.isAwaitingEmailVerification
                             ? String(format: tr("auth.enterCode"), email)
                             : tr("auth.signinSubtitle"))
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
                                TextField(tr("auth.codePlaceholder"), text: $verificationCode)
                                    .keyboardType(.numberPad)
                                    .textContentType(.oneTimeCode)
                            }
                            .glassInputStyle(cornerRadius: AppTheme.radiusInput)

                            GlassActionButton(
                                tr("auth.verify"),
                                systemImage: "checkmark.circle",
                                isDisabled: isSubmitting || verificationCode.isEmpty
                            ) {
                                submit { await state.verifyEmail(email: email, code: verificationCode) }
                            }

                            Button {
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                submit { await state.resendVerification(email: email) }
                            } label: {
                                Text(tr("auth.resend"))
                                    .font(.subheadline)
                                    .foregroundStyle(AppTheme.primary)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 8)
                                    .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)

                            Button {
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                state.isAwaitingEmailVerification = false
                                state.authError = nil
                            } label: {
                                Text(tr("auth.backToSignin"))
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 8)
                                    .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        } else {
                            if isRegistration {
                                HStack(spacing: 12) {
                                    Image(systemName: "person.fill")
                                        .foregroundColor(.secondary)
                                        .frame(width: 20)
                                    TextField(tr("auth.name"), text: $name)
                                        .textContentType(.name)
                                }
                                .glassInputStyle(cornerRadius: AppTheme.radiusInput)
                            }

                            HStack(spacing: 12) {
                                Image(systemName: "envelope.fill")
                                    .foregroundColor(.secondary)
                                    .frame(width: 20)
                                TextField(tr("auth.email"), text: $email)
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
                                SecureField(tr("auth.password"), text: $password)
                                    .textContentType(isRegistration ? .newPassword : .password)
                            }
                            .glassInputStyle(cornerRadius: AppTheme.radiusInput)

                            if isRegistration {
                                HStack(spacing: 12) {
                                    Image(systemName: "lock.shield.fill")
                                        .foregroundColor(.secondary)
                                        .frame(width: 20)
                                    SecureField(tr("auth.confirmPassword"), text: $confirmation)
                                        .textContentType(.newPassword)
                                }
                                .glassInputStyle(cornerRadius: AppTheme.radiusInput)
                            }

                            GlassActionButton(
                                isRegistration ? tr("auth.createAccount") : tr("auth.signIn"),
                                systemImage: isRegistration ? "person.badge.plus" : "arrow.right",
                                isDisabled: isSubmitting || email.isEmpty || password.isEmpty
                            ) {
                                guard !isRegistration || password == confirmation else {
                                    localError = tr("auth.passwordMismatch")
                                    return
                                }
                                guard !isRegistration || password.count >= 8 else {
                                    localError = tr("auth.passwordTooShort")
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

                            Button {
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                isRegistration.toggle()
                                localError = nil
                                state.authError = nil
                            } label: {
                                Text(isRegistration ? tr("auth.haveAccount") : tr("auth.createOne"))
                                    .font(.subheadline)
                                    .foregroundStyle(AppTheme.primary)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 10)
                                    .contentShape(Rectangle())
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
            .scrollDismissesKeyboard(.immediately)
            .dismissKeyboardOnTap()
        }
        .overlay(alignment: .topTrailing) {
            LanguagePillButton()
                .padding(.top, 8)
                .padding(.trailing, 20)
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

struct LanguagePillButton: View {
    @EnvironmentObject private var state: AppState

    var body: some View {
        FixedGlassMenu {
            Picker(tr("settings.language"), selection: Binding(
                get: { state.language },
                set: { newValue in
                    UISelectionFeedbackGenerator().selectionChanged()
                    state.updateLanguage(newValue)
                }
            )) {
                ForEach(AppLanguage.allCases, id: \.self) { language in
                    Text(language.title).tag(language)
                }
            }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: "globe")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Text(state.language.title)
                    .font(.subheadline.bold())
                    .foregroundColor(.primary)
                    .lineLimit(1)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .contentShape(Capsule())
            .liquidGlassPill()
        }
        .tint(.primary)
        .contentShape(Capsule())
        .tapFeedback()
        .accessibilityLabel(tr("settings.language"))
    }
}
