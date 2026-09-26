import SwiftUI

// MARK: - Add Transaction Modal Sheet (Modern Liquid Glass HIG)
public struct AddTransactionSheet: View {
    @Environment(\.dismiss) private var dismiss
    let onAdd: (_ amount: Double, _ description: String?, _ date: Date) -> Void

    @State private var amountString: String = ""
    @State private var isPositive: Bool = true
    @State private var description: String = ""
    @State private var date: Date = Date()

    public init(
        onAdd: @escaping (_ amount: Double, _ description: String?, _ date: Date) -> Void
    ) {
        self.onAdd = onAdd
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Transaction Form Fields
                    VStack(spacing: 16) {
                        // Direction Selector
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

                            TextField(tr("transaction.notePlaceholder"), text: $description)
                        }
                        .glassInputStyle(cornerRadius: AppTheme.radiusInput)

                        // Date Picker
                        DatePicker(tr("transaction.dateAndTime"), selection: $date, displayedComponents: [.date, .hourAndMinute])
                            .font(.subheadline)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .liquidGlassFlat(cornerRadius: AppTheme.radiusInput)
                    }

                    // Bottom Add Button
                    GlassButton(
                        tr("transaction.add"),
                        systemImage: "plus.circle.fill",
                        style: .primary,
                        size: .large
                    ) {
                        submit()
                    }
                    .disabled(invalidAmount)
                    .opacity(invalidAmount ? 0.45 : 1.0)
                    .padding(.top, 4)

                    Spacer(minLength: 24)
                }
                .padding(20)
            }
            .scrollDismissesKeyboard(.immediately)
            .dismissKeyboardOnTap()
            .navigationTitle(tr("transaction.add"))
            .navigationBarTitleDisplayMode(.inline)
            .liquidGlassSheet(detents: [.medium])
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(tr("common.cancel")) {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button(tr("common.add")) {
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        submit()
                    }
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

    private func submit() {
        guard let rawVal = Double(amountString.replacingOccurrences(of: ",", with: ".")), rawVal > 0 else { return }
        let finalAmount = isPositive ? rawVal : -rawVal
        onAdd(finalAmount, description.isEmpty ? nil : description, date)
        dismiss()
    }
}
