import SwiftUI

// MARK: - App Lock Overlay View
public struct AppLockView: View {
    @EnvironmentObject private var state: AppState

    @State private var pin: String = ""
    @State private var isError: Bool = false
    @State private var showSignOutAlert: Bool = false

    public init() {}

    public var body: some View {
        ZStack {
            MeshGradientBackground()

            VStack(spacing: 32) {
                Spacer()

                // Header
                VStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(AppTheme.primary.opacity(0.2))
                            .frame(width: 72, height: 72)

                        Image(systemName: "lock.shield.fill")
                            .font(.system(size: 32))
                            .foregroundColor(AppTheme.primary)
                    }
                    .liquidGlassCard(cornerRadius: AppTheme.radiusPill)

                    Text("Tekyida is Locked")
                        .font(.title2.bold())
                        .foregroundColor(.primary)

                    Text("Enter your 6-digit PIN to continue")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                // 6-digit PinPad
                PinPadView(
                    pin: $pin,
                    isError: isError
                ) { enteredPin in
                    verifyEnteredPin(enteredPin)
                }

                Spacer()

                // Emergency Sign Out Option
                Button {
                    showSignOutAlert = true
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                        Text("Sign Out")
                    }
                    .font(.caption.bold())
                }
                .buttonStyle(.bordered)
                .buttonBorderShape(.capsule)
                .controlSize(.small)
                .tint(AppTheme.danger)
                .padding(.bottom, 24)
            }
            .padding(.horizontal, 24)
        }
        .alert("Forgot PIN?", isPresented: $showSignOutAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Reset & Sign Out", role: .destructive) {
                _ = state.disablePin(withCurrentPin: pin)
                UserDefaults.standard.removeObject(forKey: "tekyida_lock_enabled")
                state.isLockConfigured = false
                state.isAppLocked = false
            }
        } message: {
            Text("Signing out will disable App Lock on this device.")
        }
    }

    private func verifyEnteredPin(_ enteredPin: String) {
        if state.unlockApp(withPin: enteredPin) {
            pin = ""
            isError = false
        } else {
            isError = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                pin = ""
            }
        }
    }
}
