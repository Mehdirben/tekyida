import SwiftUI

public struct SettingsView: View {
    @EnvironmentObject private var state: AppState

    @State private var newEmail = ""
    @State private var confirmEmail = ""
    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var isChangingEmail = false
    @State private var isChangingPassword = false
    @State private var emailMessage: String?
    @State private var passwordMessage: String?
    @State private var showSignOutConfirm = false

    public init() {}

    public var body: some View {
        NavigationStack {
            ZStack {
                MeshGradientBackground()
                ScrollView {
                    VStack(spacing: 20) {
                        accountSection
                        passwordSection
                        preferencesSection
                        signOutSection
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 96)
                }
                .scrollDismissesKeyboard(.immediately)
                .dismissKeyboardOnTap()
                .tabBarMinimizeBehaviorOnScroll()
            }
            .navigationTitle(tr("settings.title"))
            .navigationBarTitleDisplayMode(.large)
            .alert(tr("settings.signOutTitle"), isPresented: $showSignOutConfirm) {
                Button(tr("common.cancel"), role: .cancel) {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                }
                Button(tr("settings.signOut"), role: .destructive) {
                    UINotificationFeedbackGenerator().notificationOccurred(.warning)
                    Task { await state.signOut() }
                }
            } message: {
                Text(tr("settings.signOutMessage"))
            }
        }
    }

    private var accountSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            sectionHeader(tr("settings.email"))

            Label(state.userEmail.isEmpty ? tr("settings.account") : state.userEmail, systemImage: "envelope")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            if !state.isOnline {
                HStack(spacing: 6) {
                    Image(systemName: "wifi.slash")
                        .font(.caption)
                        .foregroundColor(AppTheme.warning)
                    Text(tr("settings.offlineEmail"))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            HStack(spacing: 12) {
                Image(systemName: "envelope")
                    .foregroundColor(.secondary)
                    .frame(width: 20)
                TextField(tr("settings.newEmail"), text: $newEmail)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .disabled(!state.isOnline)
            }
            .glassInputStyle(cornerRadius: AppTheme.radiusInput)
            .opacity(state.isOnline ? 1.0 : 0.6)

            HStack(spacing: 12) {
                Image(systemName: "envelope.badge")
                    .foregroundColor(.secondary)
                    .frame(width: 20)
                TextField(tr("settings.confirmEmail"), text: $confirmEmail)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .disabled(!state.isOnline)
            }
            .glassInputStyle(cornerRadius: AppTheme.radiusInput)
            .opacity(state.isOnline ? 1.0 : 0.6)

            if let emailMessage {
                Text(emailMessage)
                    .font(.caption)
                    .foregroundStyle(emailMessage == tr("settings.emailUpdated") ? AppTheme.accent : AppTheme.danger)
            }

            GlassButton(tr("settings.changeEmail"), systemImage: "envelope.badge", style: .primary, size: .large) {
                Task { await updateEmail() }
            }
            .disabled(!state.isOnline || isChangingEmail || newEmail.isEmpty || confirmEmail.isEmpty)
            .opacity((!state.isOnline || isChangingEmail || newEmail.isEmpty || confirmEmail.isEmpty) ? 0.45 : 1.0)
        }
        .padding(16)
        .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
    }

    private var passwordSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            sectionHeader(tr("settings.password"))

            if !state.isOnline {
                HStack(spacing: 6) {
                    Image(systemName: "wifi.slash")
                        .font(.caption)
                        .foregroundColor(AppTheme.warning)
                    Text(tr("settings.offlinePassword"))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            HStack(spacing: 12) {
                Image(systemName: "lock")
                    .foregroundColor(.secondary)
                    .frame(width: 20)
                SecureField(tr("settings.currentPassword"), text: $currentPassword)
                    .textContentType(.password)
                    .disabled(!state.isOnline)
            }
            .glassInputStyle(cornerRadius: AppTheme.radiusInput)
            .opacity(state.isOnline ? 1.0 : 0.6)

            HStack(spacing: 12) {
                Image(systemName: "key")
                    .foregroundColor(.secondary)
                    .frame(width: 20)
                SecureField(tr("settings.newPassword"), text: $newPassword)
                    .textContentType(.newPassword)
                    .disabled(!state.isOnline)
            }
            .glassInputStyle(cornerRadius: AppTheme.radiusInput)
            .opacity(state.isOnline ? 1.0 : 0.6)

            HStack(spacing: 12) {
                Image(systemName: "key.fill")
                    .foregroundColor(.secondary)
                    .frame(width: 20)
                SecureField(tr("settings.confirmNewPassword"), text: $confirmPassword)
                    .textContentType(.newPassword)
                    .disabled(!state.isOnline)
            }
            .glassInputStyle(cornerRadius: AppTheme.radiusInput)
            .opacity(state.isOnline ? 1.0 : 0.6)

            if let passwordMessage {
                Text(passwordMessage)
                    .font(.caption)
                    .foregroundStyle(passwordMessage == tr("settings.passwordUpdated") ? AppTheme.accent : AppTheme.danger)
            }

            GlassButton(tr("settings.changePassword"), systemImage: "key.fill", style: .primary, size: .large) {
                Task { await updatePassword() }
            }
            .disabled(!state.isOnline || isChangingPassword || currentPassword.isEmpty || newPassword.isEmpty || confirmPassword.isEmpty)
            .opacity((!state.isOnline || isChangingPassword || currentPassword.isEmpty || newPassword.isEmpty || confirmPassword.isEmpty) ? 0.45 : 1.0)
        }
        .padding(16)
        .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
    }

    private var preferencesSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            sectionHeader(tr("settings.preferences"))

            HStack {
                Label(tr("settings.appearance"), systemImage: "circle.lefthalf.filled")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
                Picker(tr("settings.appearance"), selection: Binding(
                    get: { state.themeMode },
                    set: { newValue in
                        UISelectionFeedbackGenerator().selectionChanged()
                        state.updateTheme(newValue)
                    }
                )) {
                    ForEach(AppThemeMode.allCases, id: \.self) { mode in
                        Text(mode.title).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .frame(maxWidth: 190)
            }

            Divider()

            GlassSelectorRow(
                title: tr("settings.language"),
                systemImage: "globe",
                selectedTitle: state.language.title
            ) {
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
            }

            Divider()

            Toggle(isOn: Binding(
                get: { state.amountsHiddenByDefault },
                set: { newValue in
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    state.updateAmountsHiddenDefault(newValue)
                }
            )) {
                Label {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(tr("settings.hideAmounts"))
                        Text(tr("settings.hideAmountsDesc"))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                } icon: {
                    Image(systemName: "eye.slash.fill").foregroundStyle(.secondary)
                }
            }

            Divider()

            Toggle(isOn: Binding(
                get: { state.transferRedirect },
                set: { newValue in
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    state.updateTransferRedirect(newValue)
                }
            )) {
                Label {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(tr("settings.transferRedirect"))
                        Text(tr("settings.transferRedirectDesc"))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                } icon: {
                    Image(systemName: "arrow.right.arrow.left").foregroundStyle(.secondary)
                }
            }
        }
        .tint(AppTheme.primary)
        .padding(16)
        .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
    }

    private var signOutSection: some View {
        GlassButton(tr("settings.signOut"), systemImage: "rectangle.portrait.and.arrow.right", style: .danger, size: .large) {
            showSignOutConfirm = true
        }
        .padding(.top, 4)
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.subheadline.bold())
            .foregroundStyle(.primary)
    }

    @MainActor
    private func updateEmail() async {
        emailMessage = nil
        guard state.isOnline else {
            emailMessage = tr("settings.emailOfflineError")
            return
        }
        guard newEmail.range(of: #"^[^\s@]+@[^\s@]+\.[^\s@]+$"#, options: .regularExpression) != nil else {
            emailMessage = tr("settings.emailInvalid")
            return
        }
        guard newEmail == confirmEmail else {
            emailMessage = tr("settings.emailMismatch")
            return
        }
        isChangingEmail = true
        defer { isChangingEmail = false }
        do {
            try await state.changeEmail(to: newEmail)
            newEmail = ""
            confirmEmail = ""
            emailMessage = tr("settings.emailUpdated")
        } catch {
            emailMessage = error.localizedDescription
        }
    }

    @MainActor
    private func updatePassword() async {
        passwordMessage = nil
        guard state.isOnline else {
            passwordMessage = tr("settings.passwordOfflineError")
            return
        }
        guard newPassword.count >= 8 else {
            passwordMessage = tr("settings.passwordTooShort")
            return
        }
        guard newPassword == confirmPassword else {
            passwordMessage = tr("settings.passwordMismatch")
            return
        }
        isChangingPassword = true
        defer { isChangingPassword = false }
        do {
            try await state.changePassword(current: currentPassword, new: newPassword)
            currentPassword = ""
            newPassword = ""
            confirmPassword = ""
            passwordMessage = tr("settings.passwordUpdated")
        } catch {
            passwordMessage = error.localizedDescription
        }
    }
}
