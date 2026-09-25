import SwiftUI

// MARK: - Add Transaction View (Modern Apple Liquid Glass HIG)
public struct AddTransactionView: View {
    @Binding var isAdding: Bool
    let onAdd: (_ amount: Double, _ description: String?, _ date: Date) -> Void

    @State private var amountString: String = ""
    @State private var isPositive: Bool = true
    @State private var description: String = ""
    @State private var date: Date = Date()

    public init(
        isAdding: Binding<Bool>,
        onAdd: @escaping (_ amount: Double, _ description: String?, _ date: Date) -> Void
    ) {
        self._isAdding = isAdding
        self.onAdd = onAdd
    }

    public var body: some View {
        VStack(spacing: 12) {
            if isAdding {
                VStack(spacing: 14) {
                    // Row 1: Direction Toggle & Amount Field
                    HStack(spacing: 10) {
                        Button(action: {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            isPositive.toggle()
                        }) {
                            HStack(spacing: 6) {
                                Image(systemName: isPositive ? "arrow.down.left" : "arrow.up.right")
                                    .font(.caption.bold())
                                Text(isPositive ? "They owe you" : "You owe them")
                                    .font(.caption.bold())
                            }
                            .foregroundColor(isPositive ? AppTheme.accent : AppTheme.danger)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 12)
                            .background(
                                isPositive ? AppTheme.accentBg : AppTheme.dangerBg,
                                in: RoundedRectangle(cornerRadius: AppTheme.radiusInput, style: .continuous)
                            )
                            .overlay {
                                RoundedRectangle(cornerRadius: AppTheme.radiusInput, style: .continuous)
                                    .stroke(
                                        (isPositive ? AppTheme.accent : AppTheme.danger).opacity(0.35),
                                        lineWidth: 1
                                    )
                            }
                        }
                        .buttonStyle(ScaleTouchStyle())

                        TextField("Amount (e.g. 150)", text: $amountString)
                            .keyboardType(.decimalPad)
                            .font(.body.weight(.semibold))
                            .glassInputStyle(cornerRadius: AppTheme.radiusInput)
                    }

                    // Row 2: Description Field
                    TextField("Description (optional)", text: $description)
                        .glassInputStyle(cornerRadius: AppTheme.radiusInput)

                    // Row 3: Date Picker
                    DatePicker("Date", selection: $date, displayedComponents: [.date, .hourAndMinute])
                        .font(.subheadline)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .liquidGlassFlat(cornerRadius: AppTheme.radiusInput)

                    // Row 4: Action Buttons (Liquid Glass Styled)
                    HStack(spacing: 10) {
                        Button(action: {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            resetFields()
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                isAdding = false
                            }
                        }) {
                            Text("Cancel")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(
                            .liquidGlass(
                                variant: .glass,
                                size: .regular,
                                cornerRadius: AppTheme.radiusButton
                            )
                        )

                        Button(action: submit) {
                            Text("Add Transaction")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(
                            .liquidGlass(
                                variant: .prominent,
                                size: .regular,
                                cornerRadius: AppTheme.radiusButton
                            )
                        )
                        .disabled(invalidAmount)
                        .opacity(invalidAmount ? 0.45 : 1.0)
                    }
                }
                .padding(16)
                .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
                .transition(.asymmetric(
                    insertion: .opacity.combined(with: .scale(scale: 0.96)),
                    removal: .opacity.combined(with: .scale(scale: 0.96))
                ))
            } else {
                GlassButton(
                    "Add Transaction",
                    systemImage: "plus.circle.fill",
                    style: .primary,
                    size: .large,
                    isFullWidth: true
                ) {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                        isAdding = true
                    }
                }
            }
        }
    }

    private var invalidAmount: Bool {
        guard let val = Double(amountString.replacingOccurrences(of: ",", with: ".")), val > 0 else {
            return true
        }
        return false
    }

    private func submit() {
        guard let rawVal = Double(amountString.replacingOccurrences(of: ",", with: ".")), rawVal > 0 else { return }
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        let finalAmount = isPositive ? rawVal : -rawVal
        onAdd(finalAmount, description.isEmpty ? nil : description, date)
        resetFields()
        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
            isAdding = false
        }
    }

    private func resetFields() {
        amountString = ""
        description = ""
        isPositive = true
        date = Date()
    }
}
