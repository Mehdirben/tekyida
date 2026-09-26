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
                VStack(spacing: 16) {
                    // Contact Avatar Header
                    Image(systemName: "person.fill")
                        .font(.system(size: 26))
                        .foregroundColor(AppTheme.primary)
                        .frame(width: 44, height: 44)
                        .background(AppTheme.primary.opacity(0.12), in: Circle())
                        .padding(.top, 4)

                    // Modern Liquid Glass Form Group
                    VStack(spacing: 14) {
                        HStack(spacing: 12) {
                            Image(systemName: "person.fill")
                                .foregroundColor(.secondary)
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

                    saveButton

                    Spacer(minLength: 0)
                }
                .padding(20)
            }
            .scrollDismissesKeyboard(.immediately)
            .dismissKeyboardOnTap()
            .navigationTitle(initialContact == nil ? "New Contact" : "Edit Contact")
            .navigationBarTitleDisplayMode(.inline)
            .liquidGlassSheet(detents: [.fraction(0.55)])
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        dismiss()
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(initialContact == nil ? "Add" : "Done") {
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        save()
                    }
                    .font(.body.bold())
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private var saveButton: some View {
        let isNameEmpty = name.trimmingCharacters(in: .whitespaces).isEmpty
        return GlassButton(
            initialContact == nil ? "Save Contact" : "Update Contact",
            systemImage: initialContact == nil ? "person.badge.plus" : "checkmark",
            style: .primary,
            size: .large,
            action: save
        )
        .disabled(isNameEmpty)
        .opacity(isNameEmpty ? 0.45 : 1.0)
        .padding(.top, 4)
    }

    private func save() {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }
        let trimmedPhone = phone.trimmingCharacters(in: .whitespacesAndNewlines)
        onSave(trimmedName, trimmedPhone.isEmpty ? nil : trimmedPhone)
        dismiss()
    }
}
