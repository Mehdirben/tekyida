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
            GeometryReader { proxy in
                ScrollView {
                    VStack(spacing: 20) {
                        // Experience Icon Banner
                        Image(systemName: "flag.fill")
                            .font(.system(size: 38))
                            .foregroundColor(AppTheme.primary)
                            .padding(.top, 12)

                        // Experience Details Fields
                        VStack(alignment: .leading, spacing: 16) {
                            HStack(spacing: 12) {
                                Image(systemName: "flag.fill")
                                    .foregroundColor(.secondary)
                                    .frame(width: 24)

                                TextField(tr("experience.namePlaceholder"), text: $name)
                                    .textInputAutocapitalization(.sentences)
                                    .onChange(of: name) { _, newVal in
                                        if newVal.count > 200 { name = String(newVal.prefix(200)) }
                                    }
                            }
                            .glassInputStyle(cornerRadius: AppTheme.radiusInput)

                            VStack(alignment: .leading, spacing: 8) {
                                Text(tr("experience.linkedContact"))
                                    .font(.subheadline.bold())
                                    .foregroundColor(.primary)

                                Picker(tr("experience.linkedContact"), selection: Binding(
                                    get: { selectedContactId },
                                    set: { newValue in
                                        UISelectionFeedbackGenerator().selectionChanged()
                                        selectedContactId = newValue
                                    }
                                )) {
                                    Text(tr("experience.noContact")).tag("")
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

                        Spacer(minLength: 0)

                        // Bottom Save Button
                        GlassButton(
                            initialExperience == nil ? tr("experience.save") : tr("experience.update"),
                            systemImage: initialExperience == nil ? "plus" : "checkmark",
                            style: .primary,
                            size: .large
                        ) {
                            save()
                        }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                        .opacity(name.trimmingCharacters(in: .whitespaces).isEmpty ? 0.45 : 1.0)
                        .padding(.top, 4)

                        Color.clear.frame(height: 24)
                    }
                    .padding(20)
                    .frame(minHeight: proxy.size.height)
                }
                .scrollDismissesKeyboard(.immediately)
                .dismissKeyboardOnTap()
            }
            .navigationTitle(initialExperience == nil ? tr("experience.new") : tr("experience.edit"))
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
                    Button(initialExperience == nil ? tr("common.create") : tr("common.done")) {
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
