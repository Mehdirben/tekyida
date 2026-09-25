import SwiftUI

// MARK: - Add Transaction View
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
                VStack(spacing: 12) {
                    // Row 1: Direction Toggle & Amount Field
                    HStack(spacing: 8) {
                        Button(action: {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            isPositive.toggle()
                        }) {
                            Text(isPositive ? "They owe you" : "You owe them")
                                .font(.caption.bold())
                                .foregroundColor(isPositive ? AppTheme.accent : AppTheme.danger)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 12)
                                .background(
                                    isPositive ? AppTheme.accentBg : AppTheme.dangerBg,
                                    in: RoundedRectangle(cornerRadius: AppTheme.radiusInput, style: .continuous)
                                )
                                .overlay {
                                    RoundedRectangle(cornerRadius: AppTheme.radiusInput, style: .continuous)
                                        .stroke(
                                            (isPositive ? AppTheme.accent : AppTheme.danger).opacity(0.3),
                                            lineWidth: 1
                                        )
                                }
                        }

                        TextField("Amount (e.g. 150)", text: $amountString)
                            .keyboardType(.decimalPad)
                            .font(.body.weight(.semibold))
                            .glassInputStyle()
                    }

                    // Row 2: Description Field
                    TextField("Description (optional)", text: $description)
                        .glassInputStyle()

                    // Row 3: Date Picker
                    DatePicker("Date", selection: $date, displayedComponents: [.date, .hourAndMinute])
                        .font(.subheadline)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .liquidGlassFlat(cornerRadius: AppTheme.radiusInput)

                    // Row 4: Action Buttons
                    HStack(spacing: 8) {
                        Button(action: {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            resetFields()
                            isAdding = false
                        }) {
                            Text("Cancel")
                                .font(.subheadline.weight(.medium))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Color.white.opacity(0.1), in: RoundedRectangle(cornerRadius: AppTheme.radiusButton, style: .continuous))
                                .foregroundColor(.secondary)
                        }

                        Button(action: submit) {
                            Text("Add Transaction")
                                .font(.subheadline.bold())
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(AppTheme.primary, in: RoundedRectangle(cornerRadius: AppTheme.radiusButton, style: .continuous))
                                .foregroundColor(.white)
                                .shadow(color: AppTheme.primary.opacity(0.3), radius: 6, x: 0, y: 3)
                        }
                        .disabled(invalidAmount)
                        .opacity(invalidAmount ? 0.5 : 1.0)
                    }
                }
                .padding(14)
                .liquidGlassCard(cornerRadius: AppTheme.radiusCard)
                .transition(.asymmetric(
                    insertion: .opacity.combined(with: .scale(scale: 0.95)),
                    removal: .opacity.combined(with: .scale(scale: 0.95))
                ))
            } else {
                Button(action: {
                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                        isAdding = true
                    }
                }) {
                    HStack(spacing: 8) {
                        Image(systemName: "plus.circle.fill")
                            .font(.headline)
                        Text("Add Transaction")
                            .font(.subheadline.bold())
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(AppTheme.primary, in: RoundedRectangle(cornerRadius: AppTheme.radiusButton, style: .continuous))
                    .foregroundColor(.white)
                    .shadow(color: AppTheme.primary.opacity(0.3), radius: 8, x: 0, y: 4)
                }
                .buttonStyle(ScaleTouchStyle())
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
