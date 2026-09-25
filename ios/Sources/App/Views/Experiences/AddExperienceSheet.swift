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
            ScrollView {
                VStack(spacing: 20) {
                    // Experience Icon Banner
                    ZStack {
                        Circle()
                            .fill(AppTheme.primary.opacity(0.12))
                            .frame(width: 64, height: 64)

                        Image(systemName: "safari.fill")
                            .font(.system(size: 34))
                            .symbolRenderingMode(.hierarchical)
                            .foregroundColor(AppTheme.primary)
                    }
                    .padding(.top, 8)

                    // Experience Details Card
                    VStack(alignment: .leading, spacing: 14) {
                        HStack(spacing: 12) {
                            Image(systemName: "flag.fill")
                                .foregroundColor(AppTheme.primary)
                                .frame(width: 24)

                            TextField("Experience Name (e.g. Summer Vacation)", text: $name)
                                .textInputAutocapitalization(.sentences)
                                .onChange(of: name) { _, newVal in
                                    if newVal.count > 200 { name = String(newVal.prefix(200)) }
                                }
                        }
                        .glassInputStyle()

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Linked Contact")
                                .font(.caption.bold())
                                .foregroundColor(.secondary)
                                .textCase(.uppercase)

                            Picker("Assign to Contact", selection: $selectedContactId) {
                                Text("None (Standalone Experience)").tag("")
                                ForEach(contacts) { c in
                                    Text(c.name).tag(c.id)
                                }
                            }
                            .pickerStyle(.menu)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                            .liquidGlassFlat(cornerRadius: AppTheme.radiusInput)
                        }
                    }
                    .padding(16)
                    .liquidGlassCard(cornerRadius: AppTheme.radiusCard)

                    Spacer(minLength: 24)
                }
                .padding(20)
            }
            .navigationTitle(initialExperience == nil ? "New Experience" : "Edit Experience")
            .navigationBarTitleDisplayMode(.inline)
            .liquidGlassSheet(detents: [.medium, .large])
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(initialExperience == nil ? "Create" : "Done") { save() }
                        .font(.body.bold())
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
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
