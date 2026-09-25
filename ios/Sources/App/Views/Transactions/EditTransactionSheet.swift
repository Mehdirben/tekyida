import SwiftUI

// MARK: - Edit Transaction Modal Sheet (Modern Liquid Glass HIG)
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
            ScrollView {
                VStack(spacing: 20) {
                    // Apple Liquid Glass Card Form
                    VStack(spacing: 16) {
                        // Direction Selector
                        Picker("Direction", selection: $isPositive) {
                            Text("They owe you").tag(true)
                            Text("You owe them").tag(false)
                        }
                        .pickerStyle(.segmented)

                        // Amount Field
                        HStack(spacing: 12) {
                            Text("MAD")
                                .font(.subheadline.bold())
                                .foregroundColor(isPositive ? AppTheme.accent : AppTheme.danger)

                            TextField("0.00", text: $amountString)
                                .keyboardType(.decimalPad)
                                .font(.title3.weight(.bold))
                        }
                        .glassInputStyle(cornerRadius: AppTheme.radiusInput)

                        // Description Field
                        HStack(spacing: 12) {
                            Image(systemName: "note.text")
                                .foregroundColor(.secondary)
                                .frame(width: 20)

                            TextField("Note or description", text: $description)
                        }
                        .glassInputStyle(cornerRadius: AppTheme.radiusInput)

                        // Date Picker
                        DatePicker("Date & Time", selection: $date, displayedComponents: [.date, .hourAndMinute])
                            .font(.subheadline)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .liquidGlassFlat(cornerRadius: AppTheme.radiusInput)
                    }
                    .padding(16)
                    .liquidGlassCard(cornerRadius: AppTheme.radiusCard)

                    // Bottom Save Button
                    GlassButton(
                        "Save Changes",
                        systemImage: "checkmark",
                        style: .primary,
                        size: .large
                    ) {
                        save()
                    }
                    .disabled(invalidAmount)
                    .opacity(invalidAmount ? 0.45 : 1.0)
                    .padding(.top, 4)

                    Spacer(minLength: 24)
                }
                .padding(20)
            }
            .navigationTitle("Edit Transaction")
            .navigationBarTitleDisplayMode(.inline)
            .liquidGlassSheet(detents: [.medium, .large])
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { save() }
                        .font(.body.bold())
                        .disabled(invalidAmount)
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

    private func save() {
        guard let rawVal = Double(amountString.replacingOccurrences(of: ",", with: ".")), rawVal > 0 else { return }
        let finalAmount = isPositive ? rawVal : -rawVal
        onSave(finalAmount, description.isEmpty ? nil : description, date)
        dismiss()
    }
}
