import SwiftUI

// MARK: - Add / Edit Contact Modal Sheet
public struct AddContactSheet: View {
    @Environment(\.dismiss) private var dismiss
    let initialContact: Contact?
    let onSave: (_ name: String, _ phone: String?) -> Void

    @State private var name: String
    @State private var phone: String

    public init(
        contact: Contact? = nil,
        onSave: @escaping (_ name: String, _ phone: String?) -> Void
    ) {
        self.initialContact = contact
        self.onSave = onSave
        _name = State(initialValue: contact?.name ?? "")
        _phone = State(initialValue: contact?.phone ?? "")
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Contact Avatar Header
                    ZStack {
                        Circle()
                            .fill(AppTheme.primary.opacity(0.12))
                            .frame(width: 64, height: 64)

                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 40))
                            .symbolRenderingMode(.hierarchical)
                            .foregroundColor(AppTheme.primary)
                    }
                    .padding(.top, 8)

                    // Apple Glass Form Group
                    VStack(spacing: 14) {
                        HStack(spacing: 12) {
                            Image(systemName: "person.fill")
                                .foregroundColor(AppTheme.primary)
                                .frame(width: 24)

                            TextField("Full Name (e.g. Sarah Smith)", text: $name)
                                .textInputAutocapitalization(.words)
                                .onChange(of: name) { _, newVal in
                                    if newVal.count > 200 { name = String(newVal.prefix(200)) }
                                }
                        }
                        .glassInputStyle()

                        HStack(spacing: 12) {
                            Image(systemName: "phone.fill")
                                .foregroundColor(AppTheme.accent)
                                .frame(width: 24)

                            TextField("Phone (optional)", text: $phone)
                                .keyboardType(.phonePad)
                        }
                        .glassInputStyle()
                    }
                    .padding(16)
                    .liquidGlassCard(cornerRadius: AppTheme.radiusCard)

                    Spacer(minLength: 24)
                }
                .padding(20)
            }
            .navigationTitle(initialContact == nil ? "New Contact" : "Edit Contact")
            .navigationBarTitleDisplayMode(.inline)
            .liquidGlassSheet(detents: [.medium, .large])
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(initialContact == nil ? "Add" : "Done") { save() }
                        .font(.body.bold())
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func save() {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }
        let trimmedPhone = phone.trimmingCharacters(in: .whitespacesAndNewlines)
        onSave(trimmedName, trimmedPhone.isEmpty ? nil : trimmedPhone)
        dismiss()
    }
}
