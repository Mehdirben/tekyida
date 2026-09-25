import SwiftUI

// MARK: - Settings View (Modern Liquid Glass HIG)
public struct SettingsView: View {
    @EnvironmentObject private var state: AppState

    @State private var pinSetupMode: PinSetupSheet.Mode?
    @State private var showChangeEmail: Bool = false
    @State private var newEmailText: String = ""
    @State private var showSignOutConfirm: Bool = false

    public init() {}

    public var body: some View {
        NavigationStack {
            ZStack {
                MeshGradientBackground()

                ScrollView {
                    VStack(spacing: 20) {
                        // Profile & Account
                        profileSection

                        // Security & App Lock
                        securitySection

                        // Preferences & Controls
                        preferencesSection

                        // Sign Out
                        signOutSection
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 96)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .sheet(item: Binding(
                get: { pinSetupMode.map { IdentifiablePinMode(mode: $0) } },
                set: { pinSetupMode = $0?.mode }
            )) { identifiable in
                PinSetupSheet(mode: identifiable.mode)
            }
            .alert("Change Email", isPresented: $showChangeEmail) {
                TextField("New email address", text: $newEmailText)
                    .textInputAutocapitalization(.never)
                Button("Cancel", role: .cancel) { newEmailText = "" }
                Button("Save") {
                    if !newEmailText.isEmpty {
                        state.userEmail = newEmailText
                        newEmailText = ""
                    }
                }
            }
            .alert("Sign Out?", isPresented: $showSignOutConfirm) {
                Button("Cancel", role: .cancel) {}
                Button("Sign Out", role: .destructive) {
                    state.lockApp()
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
        }
    }

    private var profileSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            sectionHeader("Account")

            HStack(spacing: 14) {
                ZStack {
                    ConcentricRectangle(cornerRadius: 14)
                        .fill(AppTheme.primary.opacity(0.14))
                        .frame(width: 48, height: 48)

                    Image(systemName: "person.crop.circle.fill")
                        .font(.title)
                        .symbolRenderingMode(.hierarchical)
                        .foregroundColor(AppTheme.primary)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("Tekyida Account")
                        .font(.headline)
                        .foregroundColor(.primary)

                    Text(state.userEmail)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Button(action: {
                    newEmailText = state.userEmail
                    showChangeEmail = true
                }) {
                    Text("Change")
                        .font(.caption.bold())
                        .foregroundColor(AppTheme.primary)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(AppTheme.primary.opacity(0.12), in: Capsule())
                }
                .buttonStyle(ScaleTouchStyle())
            }
        }
        .padding(16)
        .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
    }

    private var securitySection: some View {
        VStack(alignment: .leading, spacing: 14) {
            sectionHeader("Security & Privacy")

            // App Lock Toggle Row
            HStack {
                HStack(spacing: 12) {
                    Image(systemName: "lock.shield.fill")
                        .foregroundColor(AppTheme.primary)
                        .symbolRenderingMode(.hierarchical)
                        .frame(width: 24)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("App Lock PIN")
                            .font(.subheadline.bold())
                            .foregroundColor(.primary)

                        Text("Require 6-digit PIN on launch & resume")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                Toggle("", isOn: Binding(
                    get: { state.isLockConfigured },
                    set: { willEnable in
                        if willEnable {
                            pinSetupMode = .setup
                        } else {
                            pinSetupMode = .disable
                        }
                    }
                ))
                .labelsHidden()
            }

            if state.isLockConfigured {
                Divider().background(Color.white.opacity(0.1))

                HStack {
                    Button(action: { pinSetupMode = .change }) {
                        HStack(spacing: 6) {
                            Image(systemName: "key.fill")
                            Text("Change PIN")
                        }
                        .font(.subheadline.bold())
                        .foregroundColor(AppTheme.primary)
                    }
                    .buttonStyle(ScaleTouchStyle())

                    Spacer()

                    Button(action: { state.lockApp() }) {
                        HStack(spacing: 6) {
                            Image(systemName: "lock.fill")
                            Text("Lock Now")
                        }
                        .font(.caption.bold())
                        .foregroundColor(.secondary)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.white.opacity(0.1), in: Capsule())
                    }
                    .buttonStyle(ScaleTouchStyle())
                }
            }
        }
        .padding(16)
        .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
    }

    private var preferencesSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            sectionHeader("Preferences")

            // Appearance Theme Mode
            HStack {
                HStack(spacing: 12) {
                    Image(systemName: "circle.lefthalf.filled")
                        .foregroundColor(.secondary)
                        .frame(width: 24)

                    Text("Appearance")
                        .font(.subheadline)
                        .foregroundColor(.primary)
                }

                Spacer()

                Picker("Theme", selection: Binding(
                    get: { state.themeMode },
                    set: { state.updateTheme($0) }
                )) {
                    ForEach(AppThemeMode.allCases, id: \.self) { mode in
                        Text(mode.title).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .frame(maxWidth: 190)
            }

            Divider().background(Color.white.opacity(0.1))

            // Language Selector
            HStack {
                HStack(spacing: 12) {
                    Image(systemName: "globe")
                        .foregroundColor(.secondary)
                        .frame(width: 24)

                    Text("Language")
                        .font(.subheadline)
                        .foregroundColor(.primary)
                }

                Spacer()

                Picker("Language", selection: Binding(
                    get: { state.language },
                    set: { state.updateLanguage($0) }
                )) {
                    ForEach(AppLanguage.allCases, id: \.self) { lang in
                        Text(lang.title).tag(lang)
                    }
                }
                .pickerStyle(.menu)
                .foregroundColor(AppTheme.primary)
            }

            Divider().background(Color.white.opacity(0.1))

            // Hide Amounts on Launch
            Toggle(isOn: Binding(
                get: { state.amountsHiddenByDefault },
                set: { state.updateAmountsHiddenDefault($0) }
            )) {
                HStack(spacing: 12) {
                    Image(systemName: "eye.slash.fill")
                        .foregroundColor(.secondary)
                        .frame(width: 24)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Hide Amounts on Launch")
                            .font(.subheadline)
                            .foregroundColor(.primary)

                        Text("Mask currency figures by default")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Divider().background(Color.white.opacity(0.1))

            // Transfer Redirect Toggle
            Toggle(isOn: Binding(
                get: { state.transferRedirect },
                set: { state.updateTransferRedirect($0) }
            )) {
                HStack(spacing: 12) {
                    Image(systemName: "arrow.right.arrow.left")
                        .foregroundColor(.secondary)
                        .frame(width: 24)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Navigate on Transfer")
                            .font(.subheadline)
                            .foregroundColor(.primary)

                        Text("Switch active notebook when moving an experience")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
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
            .foregroundColor(.primary)
    }
}

// MARK: - Identifiable Pin Mode Wrapper
private struct IdentifiablePinMode: Identifiable {
    let id = UUID()
    let mode: PinSetupSheet.Mode
}
