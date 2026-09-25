import SwiftUI

// MARK: - Transfer Experience Modal Sheet
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
            ZStack {
                MeshGradientBackground()

                VStack(spacing: 20) {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("Transfer Experience")
                            .font(.headline)
                            .foregroundColor(.primary)

                        Text("Moving '\(experience.name)' to another notebook will also move all its transactions. Any linked contact will be unlinked as contacts belong to specific notebooks.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)

                        let otherNotebooks = state.notebooks.filter { $0.id != experience.notebookId }

                        if otherNotebooks.isEmpty {
                            Text("No other notebooks available. Create another notebook first.")
                                .font(.caption)
                                .foregroundColor(AppTheme.warning)
                                .padding(.vertical, 8)
                        } else {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Destination Notebook")
                                    .font(.caption.bold())
                                    .foregroundColor(.secondary)

                                Picker("Target Notebook", selection: $selectedNotebookId) {
                                    Text("Select Notebook").tag("")
                                    ForEach(otherNotebooks) { nb in
                                        Text(nb.name).tag(nb.id)
                                    }
                                }
                                .pickerStyle(.menu)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .liquidGlassFlat(cornerRadius: AppTheme.radiusInput)
                            }
                        }
                    }
                    .padding(20)
                    .liquidGlassCard(cornerRadius: AppTheme.radiusCard)

                    Spacer()

                    GlassButton("Transfer Experience", systemImage: "arrow.right.arrow.left", style: .primary) {
                        guard !selectedNotebookId.isEmpty else { return }
                        onTransfer(selectedNotebookId)
                        dismiss()
                    }
                    .disabled(selectedNotebookId.isEmpty)
                    .opacity(selectedNotebookId.isEmpty ? 0.5 : 1.0)
                }
                .padding(20)
            }
            .navigationTitle("Transfer")
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
}
