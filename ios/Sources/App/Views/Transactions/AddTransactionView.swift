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
                    // Row 1: Direction & Amount Field
                    VStack(spacing: 10) {
                        Picker(tr("transaction.direction"), selection: Binding(
                            get: { isPositive },
                            set: { newValue in
                                UISelectionFeedbackGenerator().selectionChanged()
                                isPositive = newValue
                            }
                        )) {
                            Text(tr("transaction.theyOweYou")).tag(true)
                            Text(tr("transaction.youOweThem")).tag(false)
                        }
                        .pickerStyle(.segmented)

                        TextField(tr("transaction.amountPlaceholder"), text: $amountString)
                            .keyboardType(.decimalPad)
                            .font(.body.weight(.semibold))
                            .glassInputStyle(cornerRadius: AppTheme.radiusInput)
                    }

                    // Row 2: Description Field
                    TextField(tr("transaction.descriptionPlaceholder"), text: $description)
                        .glassInputStyle(cornerRadius: AppTheme.radiusInput)

                    // Row 3: Date Picker
                    DatePicker(tr("transaction.date"), selection: $date, displayedComponents: [.date, .hourAndMinute])
                        .font(.subheadline)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .liquidGlassFlat(cornerRadius: AppTheme.radiusInput)

                    // Row 4: Action Buttons (Liquid Glass Styled)
                    HStack(spacing: 10) {
                        Button(action: {
                            resetFields()
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                                isAdding = false
                            }
                        }) {
                            Text(tr("common.cancel"))
                                .frame(maxWidth: .infinity)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(
                            .liquidGlass(
                                variant: .glass,
                                size: .regular,
                                cornerRadius: AppTheme.radiusButton
                            )
                        )
                        .contentShape(ConcentricRectangle(cornerRadius: AppTheme.radiusButton))

                        Button(action: submit) {
                            Text(tr("transaction.add"))
                                .frame(maxWidth: .infinity)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(
                            .liquidGlass(
                                variant: .prominent,
                                size: .regular,
                                cornerRadius: AppTheme.radiusButton
                            )
                        )
                        .contentShape(ConcentricRectangle(cornerRadius: AppTheme.radiusButton))
                        .disabled(invalidAmount)
                        .opacity(invalidAmount ? 0.45 : 1.0)
                    }
                }
                .dismissKeyboardOnTap()
                .transition(
                    .asymmetric(
                        insertion: .opacity.combined(with: .move(edge: .bottom)),
                        removal: .opacity
                    )
                )
            } else {
                GlassButton(
                    tr("transaction.add"),
                    systemImage: "plus.circle.fill",
                    style: .primary,
                    size: .large,
                    isFullWidth: true
                ) {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
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
        let finalAmount = isPositive ? rawVal : -rawVal
        onAdd(finalAmount, description.isEmpty ? nil : description, date)
        resetFields()
        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
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
