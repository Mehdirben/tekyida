import SwiftUI

// MARK: - Add / Edit Contact Modal Sheet (Modern Liquid Glass HIG)
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
                        ConcentricRectangle(cornerRadius: 22)
                            .fill(AppTheme.primary.opacity(0.14))
                            .frame(width: 72, height: 72)

                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 44))
                            .symbolRenderingMode(.hierarchical)
                            .foregroundColor(AppTheme.primary)
                    }
                    .padding(.top, 12)

                    // Modern Liquid Glass Form Group
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
                        .glassInputStyle(cornerRadius: AppTheme.radiusInput)

                        HStack(spacing: 12) {
                            Image(systemName: "phone.fill")
                                .foregroundColor(AppTheme.accent)
                                .frame(width: 24)

                            TextField("Phone (optional)", text: $phone)
                                .keyboardType(.phonePad)
                        }
                        .glassInputStyle(cornerRadius: AppTheme.radiusInput)
                    }
                    .padding(16)
                    .liquidGlassCard(cornerRadius: AppTheme.radiusCard)

                    // Bottom Save Button
                    GlassButton(
                        initialContact == nil ? "Save Contact" : "Update Contact",
                        systemImage: initialContact == nil ? "person.badge.plus" : "checkmark",
                        style: .primary,
                        size: .large
                    ) {
                        save()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                    .opacity(name.trimmingCharacters(in: .whitespaces).isEmpty ? 0.45 : 1.0)
                    .padding(.top, 4)

                    Spacer(minLength: 24)
                }
                .padding(20)
            }
            .navigationTitle(initialContact == nil ? "New Contact" : "Edit Contact")
            .navigationBarTitleDisplayMode(.inline)
            .liquidGlassSheet(detents: [.medium, .large])
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
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
