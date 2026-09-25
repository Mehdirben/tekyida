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
            ZStack {
                MeshGradientBackground()

                VStack(spacing: 20) {
                    VStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Full Name")
                                .font(.caption.bold())
                                .foregroundColor(.secondary)

                            TextField("e.g. John Doe", text: $name)
                                .glassInputStyle()
                                .onChange(of: name) { _, newVal in
                                    if newVal.count > 200 {
                                        name = String(newVal.prefix(200))
                                    }
                                }
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            Text("Phone Number (optional)")
                                .font(.caption.bold())
                                .foregroundColor(.secondary)

                            TextField("e.g. +212 600-000000", text: $phone)
                                .keyboardType(.phonePad)
                                .glassInputStyle()
                        }
                    }
                    .padding(20)
                    .liquidGlassCard(cornerRadius: AppTheme.radiusCard)

                    Spacer()

                    GlassButton(
                        initialContact == nil ? "Add Contact" : "Save Changes",
                        systemImage: "person.badge.plus",
                        style: .primary
                    ) {
                        save()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                    .opacity(name.trimmingCharacters(in: .whitespaces).isEmpty ? 0.5 : 1.0)
                }
                .padding(20)
            }
            .navigationTitle(initialContact == nil ? "New Contact" : "Edit Contact")
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

    private func save() {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }
        let trimmedPhone = phone.trimmingCharacters(in: .whitespacesAndNewlines)
        onSave(trimmedName, trimmedPhone.isEmpty ? nil : trimmedPhone)
        dismiss()
    }
}
