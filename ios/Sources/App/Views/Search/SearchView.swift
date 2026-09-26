import SwiftUI

// MARK: - Dedicated Semantic Search View (Apple Liquid Glass HIG)
public struct SearchView: View {
    @EnvironmentObject private var state: AppState

    public enum FilterScope: String, CaseIterable {
        case contacts = "Contacts"
        case experiences = "Experiences"
        case transactions = "Transactions"
    }

    @State private var query: String = ""
    @State private var scope: FilterScope = .contacts
    @State private var isSearchPresented: Bool = false
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
                    .padding(.top, 16)
                    .padding(.bottom, 96)
                }
                .scrollDismissesKeyboard(.immediately)
                .simultaneousGesture(
                    TapGesture().onEnded {
                        // Touching away closes the search bar (and its keyboard)
                        if isSearchPresented {
                            isSearchPresented = false
                        }
                    }
                )
                .tabBarMinimizeBehaviorOnScroll()
            }
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.large)
            .searchable(
                text: $query,
                isPresented: $isSearchPresented,
                placement: .automatic,
                prompt: Text("Contacts, experiences, amounts...")
            )
            .searchScopes(Binding(
                get: { scope },
                set: { newValue in
                    guard newValue != scope else { return }
                    UISelectionFeedbackGenerator().selectionChanged()
                    scope = newValue
                }
            )) {
                ForEach(FilterScope.allCases, id: \.self) { item in
                    Text(item.rawValue).tag(item)
                }
            }
            .onAppear {
                // Present the search field with the keyboard when the tab opens
                if !isSearchPresented {
                    isSearchPresented = true
                }
            }
            .sheet(item: $selectedContact) { contact in
                ContactDetailSheet(contact: contact)
                    .environmentObject(state)
                    .liquidGlassSheet(detents: [.fraction(0.94)])
            }
            .sheet(item: $selectedExperience) { exp in
                ExperienceDetailSheet(experience: exp)
                    .environmentObject(state)
                    .liquidGlassSheet(detents: [.fraction(0.94)])
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
            if isScopeEmpty(results) {
                GlassEmptyStateView(
                    systemImage: scopeIcon,
                    title: "No \(scope.rawValue) Found",
                    subtitle: "Try a different search or switch the filter."
                )
                .padding(.top, 24)
            } else {
                // Contacts
                if scope == .contacts && !results.contacts.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Contacts (\(results.contacts.count))")
                            .font(.headline)
                            .foregroundColor(.primary)

                        LazyVStack(spacing: 10) {
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
                                            HStack(spacing: 4) {
                                                Text(contact.name)
                                                    .font(.subheadline.bold())
                                                    .foregroundColor(.primary)

                                                if state.isItemPendingSync(id: contact.id) {
                                                    Image(systemName: "arrow.triangle.2.circlepath")
                                                        .font(.system(size: 10, weight: .bold))
                                                        .foregroundColor(AppTheme.warning)
                                                }
                                            }

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
                }

                // Experiences
                if scope == .experiences && !results.experiences.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Experiences (\(results.experiences.count))")
                            .font(.headline)
                            .foregroundColor(.primary)

                        LazyVStack(spacing: 10) {
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

                                                if state.isItemPendingSync(id: exp.id) {
                                                    Image(systemName: "arrow.triangle.2.circlepath")
                                                        .font(.system(size: 10, weight: .bold))
                                                        .foregroundColor(AppTheme.warning)
                                                }

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
                }

                // Transactions
                if scope == .transactions && !results.transactions.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Transactions (\(results.transactions.count))")
                            .font(.headline)
                            .foregroundColor(.primary)

                        LazyVStack(spacing: 10) {
                            ForEach(results.transactions) { tx in
                                TransactionRowView(
                                    transaction: tx,
                                    isMasked: state.isAmountsHidden,
                                    showsActions: canManageTransaction(tx),
                                    onEdit: { editingTransaction = tx },
                                    onDelete: { deletingTransaction = tx }
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    private func isScopeEmpty(_ results: AppState.SearchResults) -> Bool {
        switch scope {
        case .contacts: return results.contacts.isEmpty
        case .experiences: return results.experiences.isEmpty
        case .transactions: return results.transactions.isEmpty
        }
    }

    private var scopeIcon: String {
        switch scope {
        case .contacts: return "person.slash"
        case .experiences: return "safari"
        case .transactions: return "tray"
        }
    }

    private func canManageTransaction(_ transaction: Transaction) -> Bool {
        guard let experienceId = transaction.experienceId,
              let experience = state.experiences.first(where: { $0.id == experienceId }) else {
            return true
        }
        return !experience.closed
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
