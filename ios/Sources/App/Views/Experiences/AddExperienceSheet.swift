import SwiftUI

// MARK: - Add / Edit Experience Sheet (Modern Liquid Glass HIG)
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
                        ConcentricRectangle(cornerRadius: 22)
                            .fill(AppTheme.primary.opacity(0.14))
                            .frame(width: 72, height: 72)

                        Image(systemName: "safari.fill")
                            .font(.system(size: 38))
                            .symbolRenderingMode(.hierarchical)
                            .foregroundColor(AppTheme.primary)
                    }
                    .padding(.top, 12)

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
                        .glassInputStyle(cornerRadius: AppTheme.radiusInput)

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Linked Contact")
                                .font(.subheadline.bold())
                                .foregroundColor(.primary)

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

                    // Bottom Save Button
                    GlassButton(
                        initialExperience == nil ? "Save Experience" : "Update Experience",
                        systemImage: initialExperience == nil ? "plus.circle.fill" : "checkmark",
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
            .navigationTitle(initialExperience == nil ? "New Experience" : "Edit Experience")
            .navigationBarTitleDisplayMode(.inline)
            .liquidGlassSheet(detents: [.medium])
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
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
