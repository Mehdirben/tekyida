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
                VStack(spacing: 16) {
                    // Experience Icon Banner
                    Image(systemName: "flag.fill")
                        .font(.system(size: 24))
                        .foregroundColor(AppTheme.primary)
                        .frame(width: 44, height: 44)
                        .background(AppTheme.primary.opacity(0.12), in: Circle())
                        .padding(.top, 4)

                    // Experience Details Fields
                    VStack(alignment: .leading, spacing: 14) {
                        HStack(spacing: 12) {
                            Image(systemName: "flag.fill")
                                .foregroundColor(.secondary)
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

                            Picker("Assign to Contact", selection: Binding(
                                get: { selectedContactId },
                                set: { newValue in
                                    UISelectionFeedbackGenerator().selectionChanged()
                                    selectedContactId = newValue
                                }
                            )) {
                                Text("None (Standalone Experience)").tag("")
                                ForEach(contacts) { c in
                                    Text(c.name).tag(c.id)
                                }
                            }
                            .pickerStyle(.menu)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                            .contentShape(Rectangle())
                            .liquidGlassFlat(cornerRadius: AppTheme.radiusInput)
                        }
                    }

                    // Bottom Save Button
                    GlassButton(
                        initialExperience == nil ? "Save Experience" : "Update Experience",
                        systemImage: initialExperience == nil ? "plus" : "checkmark",
                        style: .primary,
                        size: .large
                    ) {
                        save()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                    .opacity(name.trimmingCharacters(in: .whitespaces).isEmpty ? 0.45 : 1.0)
                    .padding(.top, 4)

                    Spacer(minLength: 0)
                }
                .padding(20)
            }
            .scrollDismissesKeyboard(.immediately)
            .dismissKeyboardOnTap()
            .navigationTitle(initialExperience == nil ? "New Experience" : "Edit Experience")
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
                    Button(initialExperience == nil ? "Create" : "Done") {
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        save()
                    }
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
