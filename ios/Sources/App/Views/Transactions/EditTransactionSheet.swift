import SwiftUI

// MARK: - Edit Transaction Modal Sheet
public struct EditTransactionSheet: View {
    @Environment(\.dismiss) private var dismiss
    let transaction: Transaction
    let onSave: (_ amount: Double, _ description: String?, _ date: Date) -> Void

    @State private var amountString: String
    @State private var isPositive: Bool
    @State private var description: String
    @State private var date: Date

    public init(
        transaction: Transaction,
        onSave: @escaping (_ amount: Double, _ description: String?, _ date: Date) -> Void
    ) {
        self.transaction = transaction
        self.onSave = onSave
        _amountString = State(initialValue: String(format: "%.2f", abs(transaction.amount)))
        _isPositive = State(initialValue: transaction.amount >= 0)
        _description = State(initialValue: transaction.description ?? "")
        _date = State(initialValue: transaction.date)
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                MeshGradientBackground()

                VStack(spacing: 20) {
                    // Form Card
                    VStack(spacing: 16) {
                        // Direction Selector
                        HStack(spacing: 12) {
                            directionButton(
                                title: "They owe you",
                                isSelected: isPositive,
                                color: AppTheme.accent,
                                bgColor: AppTheme.accentBg
                            ) {
                                isPositive = true
                            }

                            directionButton(
                                title: "You owe them",
                                isSelected: !isPositive,
                                color: AppTheme.danger,
                                bgColor: AppTheme.dangerBg
                            ) {
                                isPositive = false
                            }
                        }

                        // Amount
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Amount (MAD)")
                                .font(.caption.bold())
                                .foregroundColor(.secondary)

                            TextField("Amount", text: $amountString)
                                .keyboardType(.decimalPad)
                                .font(.title3.weight(.bold))
                                .glassInputStyle()
                        }

                        // Description
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Description")
                                .font(.caption.bold())
                                .foregroundColor(.secondary)

                            TextField("Description (optional)", text: $description)
                                .glassInputStyle()
                        }

                        // Date
                        DatePicker("Date & Time", selection: $date, displayedComponents: [.date, .hourAndMinute])
                            .font(.subheadline)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .liquidGlassFlat(cornerRadius: AppTheme.radiusInput)
                    }
                    .padding(20)
                    .liquidGlassCard(cornerRadius: AppTheme.radiusCard)

                    Spacer()

                    // Save Action
                    GlassButton("Save Changes", systemImage: "checkmark.circle.fill", style: .primary) {
                        save()
                    }
                    .disabled(invalidAmount)
                    .opacity(invalidAmount ? 0.5 : 1.0)
                }
                .padding(20)
            }
            .navigationTitle("Edit Transaction")
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

    private var invalidAmount: Bool {
        guard let val = Double(amountString.replacingOccurrences(of: ",", with: ".")), val > 0 else {
            return true
        }
        return false
    }

    private func directionButton(
        title: String,
        isSelected: Bool,
        color: Color,
        bgColor: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        }) {
            Text(title)
                .font(.subheadline.bold())
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .foregroundColor(isSelected ? color : .secondary)
                .background(isSelected ? bgColor : Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: AppTheme.radiusInput, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: AppTheme.radiusInput, style: .continuous)
                        .stroke(isSelected ? color.opacity(0.4) : Color.white.opacity(0.1), lineWidth: 1)
                }
        }
    }

    private func save() {
        guard let rawVal = Double(amountString.replacingOccurrences(of: ",", with: ".")), rawVal > 0 else { return }
        let finalAmount = isPositive ? rawVal : -rawVal
        onSave(finalAmount, description.isEmpty ? nil : description, date)
        dismiss()
    }
}
