import SwiftUI

// MARK: - Dedicated Semantic Search View (Apple Liquid Glass HIG)
public struct SearchView: View {
    @EnvironmentObject private var state: AppState

    public enum FilterScope: String, CaseIterable {
        case all = "All"
        case contacts = "Contacts"
        case experiences = "Experiences"
        case transactions = "Transactions"
    }

    @State private var query: String = ""
    @State private var scope: FilterScope = .all
    @State private var selectedContact: Contact?
    @State private var selectedExperience: Experience?
    @State private var editingTransaction: Transaction?
    @State private var deletingTransaction: Transaction?

    public init() {}

    public var body: some View {
        NavigationStack {
            ZStack {
                MeshGradientBackground()

                ScrollView {
                    VStack(spacing: 20) {
                        if query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            recentOrEmptyState
                        } else {
                            resultsSection
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 96)
                }
                .scrollDismissesKeyboard(.immediately)
                .tabBarMinimizeBehaviorOnScroll()
            }
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(
                text: $query,
                placement: .navigationBarDrawer(displayMode: .always),
                prompt: Text("Contacts, experiences, amounts...")
            )
            .searchScopes($scope) {
                ForEach(FilterScope.allCases, id: \.self) { item in
                    Text(item.rawValue).tag(item)
                }
            }
            .sheet(item: $selectedContact) { contact in
                ContactDetailSheet(contact: contact)
                    .environmentObject(state)
            }
            .sheet(item: $selectedExperience) { exp in
                ExperienceDetailSheet(experience: exp)
                    .environmentObject(state)
            }
            .transactionModals(
                editingTransaction: $editingTransaction,
                deletingTransaction: $deletingTransaction,
                onSave: { id, amount, desc, date in
                    state.updateTransaction(id: id, amount: amount, description: desc, date: date)
                },
                onDelete: { id in
                    state.deleteTransaction(id: id)
                }
            )
        }
    }

    // MARK: - Results Section
    private var resultsSection: some View {
        let results = state.search(query: query)

        return VStack(spacing: 18) {
            if results.isEmpty {
                GlassEmptyStateView(
                    systemImage: "magnifyingglass",
                    title: "No Matches Found",
                    subtitle: "Try searching for a different name, trip, or amount."
                )
                .padding(.top, 24)
            } else {
                // Contacts
                if (scope == .all || scope == .contacts) && !results.contacts.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Contacts (\(results.contacts.count))")
                            .font(.headline)
                            .foregroundColor(.primary)

                        ForEach(results.contacts) { contact in
                            Button(action: {
                                selectedContact = contact
                            }) {
                                HStack(spacing: 12) {
                                    ZStack {
                                        Circle()
                                            .fill(AppTheme.primary.opacity(0.15))
                                            .frame(width: 40, height: 40)
                                        Image(systemName: "person.fill")
                                            .foregroundColor(AppTheme.primary)
                                    }

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(contact.name)
                                            .font(.subheadline.bold())
                                            .foregroundColor(.primary)

                                        if let phone = contact.phone, !phone.isEmpty {
                                            Text(phone)
                                                .font(.caption2)
                                                .foregroundColor(.secondary)
                                        }
                                    }

                                    Spacer()

                                    AmountView(
                                        amount: state.contactBalance(contact.id),
                                        isHidden: state.isAmountsHidden,
                                        font: .subheadline,
                                        fontWeight: .bold
                                    )

                                    Image(systemName: "chevron.right")
                                        .font(.caption2.bold())
                                        .foregroundColor(.secondary.opacity(0.6))
                                }
                                .padding(12)
                                .liquidGlassFlat(cornerRadius: AppTheme.radiusCard)
                            }
                            .buttonStyle(ScaleTouchStyle())
                        }
                    }
                }

                // Experiences
                if (scope == .all || scope == .experiences) && !results.experiences.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Experiences (\(results.experiences.count))")
                            .font(.headline)
                            .foregroundColor(.primary)

                        ForEach(results.experiences) { exp in
                            Button(action: {
                                selectedExperience = exp
                            }) {
                                HStack(spacing: 12) {
                                    ZStack {
                                        Circle()
                                            .fill(AppTheme.primary.opacity(0.15))
                                            .frame(width: 40, height: 40)
                                        Image(systemName: "safari.fill")
                                            .foregroundColor(AppTheme.primary)
                                    }

                                    VStack(alignment: .leading, spacing: 2) {
                                        HStack(spacing: 6) {
                                            Text(exp.name)
                                                .font(.subheadline.bold())
                                                .foregroundColor(.primary)

                                            if exp.closed {
                                                StatusBadge(
                                                    title: "Closed",
                                                    color: AppTheme.warning,
                                                    backgroundColor: AppTheme.warningBg
                                                )
                                            }
                                        }

                                        let txCount = state.experienceTransactions(exp.id).count
                                        Text("\(txCount) transaction\(txCount == 1 ? "" : "s")")
                                            .font(.caption2)
                                            .foregroundColor(.secondary)
                                    }

                                    Spacer()

                                    AmountView(
                                        amount: state.experienceBalance(exp.id),
                                        isHidden: state.isAmountsHidden,
                                        font: .subheadline,
                                        fontWeight: .bold
                                    )

                                    Image(systemName: "chevron.right")
                                        .font(.caption2.bold())
                                        .foregroundColor(.secondary.opacity(0.6))
                                }
                                .padding(12)
                                .liquidGlassFlat(cornerRadius: AppTheme.radiusCard)
                            }
                            .buttonStyle(ScaleTouchStyle())
                        }
                    }
                }

                // Transactions
                if (scope == .all || scope == .transactions) && !results.transactions.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Transactions (\(results.transactions.count))")
                            .font(.headline)
                            .foregroundColor(.primary)

                        ForEach(results.transactions) { tx in
                            TransactionRowView(
                                transaction: tx,
                                isMasked: state.isAmountsHidden,
                                onEdit: { editingTransaction = tx },
                                onDelete: { deletingTransaction = tx }
                            )
                        }
                    }
                }
            }
        }
    }

    // MARK: - Initial State
    private var recentOrEmptyState: some View {
        VStack(spacing: 16) {
            GlassEmptyStateView(
                systemImage: "magnifyingglass.circle.fill",
                title: "Quick Search",
                subtitle: "Search contacts, shared experiences, descriptions, or transaction amounts."
            )
            .padding(.top, 16)
        }
    }
}
