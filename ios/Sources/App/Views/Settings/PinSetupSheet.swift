import SwiftUI

// MARK: - PIN Setup & Change Modal Sheet
public struct PinSetupSheet: View {
    public enum Mode {
        case setup
        case change
        case disable
    }

    @EnvironmentObject private var state: AppState
    @Environment(\.dismiss) private var dismiss
    let mode: Mode

    @State private var currentStep: Step = .first
    @State private var pin: String = ""
    @State private var tempPin: String = ""
    @State private var isError: Bool = false

    private enum Step {
        case first
        case second
        case third
    }

    public init(mode: Mode) {
        self.mode = mode
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                MeshGradientBackground()

                VStack(spacing: 24) {
                    Spacer()

                    // Icon & Instruction Title
                    VStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(AppTheme.primary.opacity(0.15))
                                .frame(width: 56, height: 56)

                            Image(systemName: "lock.shield.fill")
                                .font(.title2)
                                .foregroundColor(AppTheme.primary)
                        }

                        Text(instructionTitle)
                            .font(.title3.bold())
                            .foregroundColor(.primary)

                        Text(instructionSubtitle)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }

                    // Keypad
                    PinPadView(
                        pin: $pin,
                        isError: isError
                    ) { enteredPin in
                        handlePinComplete(enteredPin)
                    }

                    Spacer()
                }
                .padding(24)
            }
            .navigationTitle(navTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }

    private var navTitle: String {
        switch mode {
        case .setup: return "Set PIN"
        case .change: return "Change PIN"
        case .disable: return "Disable PIN"
        }
    }

    private var instructionTitle: String {
        switch mode {
        case .setup:
            return currentStep == .first ? "Enter New PIN" : "Confirm PIN"
        case .disable:
            return "Enter Current PIN"
        case .change:
            switch currentStep {
            case .first: return "Enter Current PIN"
            case .second: return "Enter New PIN"
            case .third: return "Confirm New PIN"
            }
        }
    }

    private var instructionSubtitle: String {
        switch mode {
        case .setup:
            return currentStep == .first ? "Choose a 6-digit code" : "Re-enter your 6-digit code"
        case .disable:
            return "Enter your current PIN to turn off lock"
        case .change:
            switch currentStep {
            case .first: return "Verify your identity"
            case .second: return "Choose your new 6-digit PIN"
            case .third: return "Re-enter your new PIN to confirm"
            }
        }
    }

    private func handlePinComplete(_ entered: String) {
        switch mode {
        case .setup:
            if currentStep == .first {
                tempPin = entered
                pin = ""
                currentStep = .second
            } else {
                if entered == tempPin {
                    state.setPin(entered)
                    dismiss()
                } else {
                    triggerError()
                }
            }
        case .disable:
            if state.disablePin(withCurrentPin: entered) {
                dismiss()
            } else {
                triggerError()
            }
        case .change:
            switch currentStep {
            case .first:
                if state.verifyPin(entered) {
                    pin = ""
                    currentStep = .second
                } else {
                    triggerError()
                }
            case .second:
                tempPin = entered
                pin = ""
                currentStep = .third
            case .third:
                if entered == tempPin {
                    state.setPin(entered)
                    dismiss()
                } else {
                    triggerError()
                }
            }
        }
    }

    private func triggerError() {
        isError = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            pin = ""
        }
    }
}
