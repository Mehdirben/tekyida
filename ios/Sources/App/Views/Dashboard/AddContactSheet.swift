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
                    Image(systemName: "person.fill")
                        .font(.system(size: 44))
                        .foregroundColor(AppTheme.primary)
                        .padding(.top, 12)

                    // Modern Liquid Glass Form Group
                    VStack(spacing: 16) {
                        HStack(spacing: 12) {
                            Image(systemName: "person.fill")
                                .foregroundColor(.secondary)
                                .frame(width: 24)

                            TextField(tr("contact.namePlaceholder"), text: $name)
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

                            TextField(tr("contact.phonePlaceholder"), text: $phone)
                                .keyboardType(.phonePad)
                        }
                        .glassInputStyle(cornerRadius: AppTheme.radiusInput)
                    }

                    saveButton

                    Spacer(minLength: 24)
                }
                .padding(20)
                .fittedLiquidGlassSheet(chrome: 60)
            }
            .scrollDisabled(true)
            .dismissKeyboardOnTap()
            .navigationTitle(initialContact == nil ? tr("contact.new") : tr("contact.edit"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(tr("common.cancel")) {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        dismiss()
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(initialContact == nil ? tr("common.add") : tr("common.done")) {
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
            initialContact == nil ? tr("contact.save") : tr("contact.update"),
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
