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
                .tabBarMinimizeBehaviorOnScroll()
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .alert("Sign Out?", isPresented: $showSignOutConfirm) {
                Button("Cancel", role: .cancel) {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                }
                Button("Sign Out", role: .destructive) {
                    UINotificationFeedbackGenerator().notificationOccurred(.warning)
                    Task { await state.signOut() }
                }
            } message: {
                Text("You can sign back in to sync your notebooks.")
            }
        }
    }

    private var accountSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            sectionHeader("Email")

            Label(state.userEmail.isEmpty ? "Tekyida Account" : state.userEmail, systemImage: "envelope")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            TextField("New email address", text: $newEmail)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .textFieldStyle(.roundedBorder)

            TextField("Confirm new email", text: $confirmEmail)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .textFieldStyle(.roundedBorder)

            if let emailMessage {
                Text(emailMessage)
                    .font(.caption)
                    .foregroundStyle(emailMessage.hasPrefix("Email updated") ? AppTheme.accent : AppTheme.danger)
            }

            Button {
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                Task { await updateEmail() }
            } label: {
                if isChangingEmail {
                    ProgressView().tint(.white)
                } else {
                    Text("Change Email")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(AppTheme.primary)
            .disabled(isChangingEmail || newEmail.isEmpty || confirmEmail.isEmpty)
        }
        .padding(16)
        .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
    }

    private var passwordSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            sectionHeader("Password")

            SecureField("Current password", text: $currentPassword)
                .textContentType(.password)
                .textFieldStyle(.roundedBorder)

            SecureField("New password (at least 8 characters)", text: $newPassword)
                .textContentType(.newPassword)
                .textFieldStyle(.roundedBorder)

            SecureField("Confirm new password", text: $confirmPassword)
                .textContentType(.newPassword)
                .textFieldStyle(.roundedBorder)

            if let passwordMessage {
                Text(passwordMessage)
                    .font(.caption)
                    .foregroundStyle(passwordMessage.hasPrefix("Password updated") ? AppTheme.accent : AppTheme.danger)
            }

            Button {
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                Task { await updatePassword() }
            } label: {
                if isChangingPassword {
                    ProgressView().tint(.white)
                } else {
                    Text("Change Password")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(AppTheme.primary)
            .disabled(isChangingPassword || currentPassword.isEmpty || newPassword.isEmpty || confirmPassword.isEmpty)
        }
        .padding(16)
        .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
    }

    private var preferencesSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            sectionHeader("Preferences")

            HStack {
                Label("Appearance", systemImage: "circle.lefthalf.filled")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
                Picker("Theme", selection: Binding(
                    get: { state.themeMode },
                    set: { newValue in
                        UISelectionFeedbackGenerator().selectionChanged()
                        state.updateTheme(newValue)
                    }
                )) {
                    ForEach(AppThemeMode.allCases, id: .self) { mode in
                        Text(mode.title).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .frame(maxWidth: 190)
            }

            Divider()

            HStack {
                Label("Language", systemImage: "globe")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
                Menu {
                    Picker("Language", selection: Binding(
                        get: { state.language },
                        set: { newValue in
                            UISelectionFeedbackGenerator().selectionChanged()
                            state.updateLanguage(newValue)
                        }
                    )) {
                        ForEach(AppLanguage.allCases, id: .self) { language in
                            Text(language.title).tag(language)
                        }
                    }
                } label: {
                    HStack(spacing: 6) {
                        Text(state.language.title).font(.subheadline.bold())
                        Image(systemName: "chevron.down").font(.caption2.bold())
                    }
                    .foregroundStyle(.primary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 7)
                    .liquidGlassPill()
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
                        Text("Hide Amounts on Launch")
                        Text("Mask currency figures by default")
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
                        Text("Navigate on Transfer")
                        Text("Switch notebook when moving an experience")
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
        GlassButton("Sign Out", systemImage: "rectangle.portrait.and.arrow.right", style: .danger, size: .large) {
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
        guard newEmail.range(of: #"^[^\s@]+@[^\s@]+\.[^\s@]+$"#, options: .regularExpression) != nil else {
            emailMessage = "Enter a valid email address."
            return
        }
        guard newEmail == confirmEmail else {
            emailMessage = "Email addresses do not match."
            return
        }
        isChangingEmail = true
        defer { isChangingEmail = false }
        do {
            try await state.changeEmail(to: newEmail)
            newEmail = ""
            confirmEmail = ""
            emailMessage = "Email updated successfully."
        } catch {
            emailMessage = error.localizedDescription
        }
    }

    @MainActor
    private func updatePassword() async {
        passwordMessage = nil
        guard newPassword.count >= 8 else {
            passwordMessage = "Password must be at least 8 characters."
            return
        }
        guard newPassword == confirmPassword else {
            passwordMessage = "Passwords do not match."
            return
        }
        isChangingPassword = true
        defer { isChangingPassword = false }
        do {
            try await state.changePassword(current: currentPassword, new: newPassword)
            currentPassword = ""
            newPassword = ""
            confirmPassword = ""
            passwordMessage = "Password updated successfully."
        } catch {
            passwordMessage = error.localizedDescription
        }
    }
}
