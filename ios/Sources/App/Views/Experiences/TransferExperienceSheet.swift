import SwiftUI

// MARK: - Transfer Experience Modal Sheet (Modern Liquid Glass HIG)
public struct TransferExperienceSheet: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.dismiss) private var dismiss
    let experience: Experience
    let onTransfer: (_ targetNotebookId: String) -> Void

    @State private var selectedNotebookId: String = ""

    public init(
        experience: Experience,
        onTransfer: @escaping (_ targetNotebookId: String) -> Void
    ) {
        self.experience = experience
        self.onTransfer = onTransfer
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                // Info Card
                VStack(alignment: .leading, spacing: 14) {
                    HStack(spacing: 12) {
                        ZStack {
                            ConcentricRectangle(cornerRadius: 14)
                                .fill(AppTheme.primary.opacity(0.14))
                                .frame(width: 48, height: 48)

                            Image(systemName: "arrow.right.arrow.left")
                                .font(.headline)
                                .foregroundColor(AppTheme.primary)
                        }

                        VStack(alignment: .leading, spacing: 2) {
                            Text(experience.name)
                                .font(.headline)
                                .foregroundColor(.primary)

                            Text("Move to another notebook")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }

                    Text("Moving this experience will transfer all associated transactions. Contacts are notebook-scoped, so any contact link will be detached.")
                        .font(.footnote)
                        .foregroundColor(.secondary)

                    let otherNotebooks = state.notebooks.filter { $0.id != experience.notebookId }

                    if otherNotebooks.isEmpty {
                        Text("No other notebooks found. Create another notebook first.")
                            .font(.caption)
                            .foregroundColor(AppTheme.warning)
                            .padding(.top, 4)
                    } else {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Target Notebook")
                                .font(.subheadline.bold())
                                .foregroundColor(.primary)

                            Picker("Notebook", selection: Binding(
                                get: { selectedNotebookId },
                                set: { newValue in
                                    UISelectionFeedbackGenerator().selectionChanged()
                                    selectedNotebookId = newValue
                                }
                            )) {
                                Text("Select Destination").tag("")
                                ForEach(otherNotebooks) { nb in
                                    Text(nb.name).tag(nb.id)
                                }
                            }
                            .pickerStyle(.menu)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                            .liquidGlassFlat(cornerRadius: AppTheme.radiusInput)
                        }
                        .padding(.top, 4)
                    }
                }
                .padding(16)
                .liquidGlassCard(cornerRadius: AppTheme.radiusCard)

                if !state.notebooks.filter({ $0.id != experience.notebookId }).isEmpty {
                    GlassButton(
                        "Confirm Transfer",
                        systemImage: "arrow.right.arrow.left",
                        style: .primary,
                        size: .large
                    ) {
                        guard !selectedNotebookId.isEmpty else { return }
                        onTransfer(selectedNotebookId)
                        dismiss()
                    }
                    .disabled(selectedNotebookId.isEmpty)
                    .opacity(selectedNotebookId.isEmpty ? 0.45 : 1.0)
                }

                Spacer()
            }
            .padding(20)
            .navigationTitle("Transfer Experience")
            .navigationBarTitleDisplayMode(.inline)
            .liquidGlassSheet(detents: [.medium])
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button("Transfer") {
                        guard !selectedNotebookId.isEmpty else { return }
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        onTransfer(selectedNotebookId)
                        dismiss()
                    }
                    .font(.body.bold())
                    .disabled(selectedNotebookId.isEmpty)
                }
            }
        }
    }
}
