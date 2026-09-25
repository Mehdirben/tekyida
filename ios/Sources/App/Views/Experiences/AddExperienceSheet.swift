import SwiftUI

// MARK: - Add / Edit Experience Sheet
public struct AddExperienceSheet: View {
    @Environment(\.dismiss) private var dismiss
    let contacts: [Contact]
    let initialExperience: Experience?
    let onSave: (_ name: String, _ contactId: String?) -> Void

    @State private var name: String
    @State private var selectedContactId: String

    public init(
        contacts: [Contact],
        experience: Experience? = nil,
        onSave: @escaping (_ name: String, _ contactId: String?) -> Void
    ) {
        self.contacts = contacts
        self.initialExperience = experience
        self.onSave = onSave
        _name = State(initialValue: experience?.name ?? "")
        _selectedContactId = State(initialValue: experience?.contactId ?? "")
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                MeshGradientBackground()

                VStack(spacing: 20) {
                    VStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Experience Name")
                                .font(.caption.bold())
                                .foregroundColor(.secondary)

                            TextField("e.g. Weekend Roadtrip", text: $name)
                                .glassInputStyle()
                                .onChange(of: name) { _, newVal in
                                    if newVal.count > 200 {
                                        name = String(newVal.prefix(200))
                                    }
                                }
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            Text("Linked Contact (optional)")
                                .font(.caption.bold())
                                .foregroundColor(.secondary)

                            Picker("Contact", selection: $selectedContactId) {
                                Text("No Contact").tag("")
                                ForEach(contacts) { contact in
                                    Text(contact.name).tag(contact.id)
                                }
                            }
                            .pickerStyle(.menu)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .liquidGlassFlat(cornerRadius: AppTheme.radiusInput)
                        }
                    }
                    .padding(20)
                    .liquidGlassCard(cornerRadius: AppTheme.radiusCard)

                    Spacer()

                    GlassButton(
                        initialExperience == nil ? "Create Experience" : "Save Changes",
                        systemImage: "safari.fill",
                        style: .primary
                    ) {
                        save()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                    .opacity(name.trimmingCharacters(in: .whitespaces).isEmpty ? 0.5 : 1.0)
                }
                .padding(20)
            }
            .navigationTitle(initialExperience == nil ? "New Experience" : "Edit Experience")
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
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let cid = selectedContactId.isEmpty ? nil : selectedContactId
        onSave(trimmed, cid)
        dismiss()
    }
}
