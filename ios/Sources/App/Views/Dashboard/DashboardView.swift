import SwiftUI

// MARK: - Dashboard Main View
public struct DashboardView: View {
    @EnvironmentObject private var state: AppState

    @State private var showNotebookManager: Bool = false
    @State private var showAddContact: Bool = false
    @State private var selectedContact: Contact?
    @State private var editingContact: Contact?
    @State private var deletingContact: Contact?

    public init() {}

    public var body: some View {
        NavigationStack {
            ZStack {
                MeshGradientBackground()

                ScrollView {
                    VStack(spacing: 20) {
                        NotebookHeaderButton(
                            notebookName: state.activeNotebook?.name ?? "Select Notebook",
                            onTap: { showNotebookManager = true }
                        )

                        if let activeNb = state.activeNotebook {
                            QuickStatsView(
                                moneyOwed: state.moneyOwed(for: activeNb.id),
                                moneyGiven: state.moneyGiven(for: activeNb.id),
                                netBalance: state.netBalance(for: activeNb.id),
                                isHidden: state.isAmountsHidden,
                                onTogglePrivacy: {
                                    state.isAmountsHidden.toggle()
                                }
                            )
                        }

                        contactsSection
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 96)
                }
            }
            .navigationTitle("Tekyida")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Image("AppLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 28, height: 28)
                        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: {
                        showAddContact = true
                    }) {
                        Image(systemName: "person.crop.circle.badge.plus")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(AppTheme.primary)
                    }
                }
            }
            .sheet(isPresented: $showNotebookManager) {
                NotebookManagerSheet()
            }
            .sheet(isPresented: $showAddContact) {
                if let activeNb = state.activeNotebook {
                    AddContactSheet { name, phone in
                        state.createContact(notebookId: activeNb.id, name: name, phone: phone)
                    }
                }
            }
            .sheet(item: $selectedContact) { contact in
                ContactDetailSheet(contact: contact)
            }
            .sheet(item: $editingContact) { contact in
                AddContactSheet(contact: contact) { name, phone in
                    state.updateContact(id: contact.id, name: name, phone: phone)
                }
            }
            .alert("Delete Contact?", isPresented: Binding(
                get: { deletingContact != nil },
                set: { if !$0 { deletingContact = nil } }
            )) {
                Button("Cancel", role: .cancel) { deletingContact = nil }
                Button("Delete", role: .destructive) {
                    if let contact = deletingContact {
                        state.deleteContact(id: contact.id)
                        deletingContact = nil
                    }
                }
            } message: {
                Text("Deleting '\(deletingContact?.name ?? "")' will remove all their direct transactions.")
            }
        }
    }

    private var contactsSection: some View {
        let activeId = state.activeNotebook?.id ?? ""
        let currentContacts = state.contacts.filter { $0.notebookId == activeId }

        let sortedContacts = currentContacts.sorted { c1, c2 in
            let b1 = abs(state.contactBalance(c1.id))
            let b2 = abs(state.contactBalance(c2.id))
            if (b1 > 0) != (b2 > 0) {
                return b1 > 0
            }
            return c1.name.localizedCaseInsensitiveCompare(c2.name) == .orderedAscending
        }

        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Contacts (\(currentContacts.count))")
                    .font(.caption.bold())
                    .foregroundColor(.secondary)
                    .textCase(.uppercase)

                Spacer()

                Button(action: { showAddContact = true }) {
                    Label("Add", systemImage: "plus")
                        .font(.caption.bold())
                        .foregroundColor(AppTheme.primary)
                }
            }
            .padding(.horizontal, 4)

            if sortedContacts.isEmpty {
                GlassEmptyStateView(
                    systemImage: "person.2.slash",
                    title: "No contacts yet",
                    subtitle: "Add your first contact to track money owed or lent."
                )
            } else {
                ForEach(sortedContacts) { contact in
                    ContactRowView(
                        contact: contact,
                        balance: state.contactBalance(contact.id),
                        isMasked: state.isAmountsHidden,
                        onTap: {
                            selectedContact = contact
                        },
                        onEdit: {
                            editingContact = contact
                        },
                        onDelete: {
                            deletingContact = contact
                        }
                    )
                }
            }
        }
    }
}
