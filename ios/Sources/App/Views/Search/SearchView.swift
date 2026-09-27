import SwiftUI

// MARK: - Dedicated Semantic Search View (Apple Liquid Glass HIG)
public struct SearchView: View {
    @EnvironmentObject private var state: AppState

    public enum FilterScope: String, CaseIterable {
        case contacts = "Contacts"
        case experiences = "Experiences"
        case transactions = "Transactions"

        public var localizedName: String {
            switch self {
            case .contacts: return tr("search.scope.contacts")
            case .experiences: return tr("search.scope.experiences")
            case .transactions: return tr("search.scope.transactions")
            }
        }

        public var emptyResultTitle: String {
            switch self {
            case .contacts: return tr("search.noResults.contacts")
            case .experiences: return tr("search.noResults.experiences")
            case .transactions: return tr("search.noResults.transactions")
            }
        }
    }

    @State private var query: String = ""
    @State private var scope: FilterScope = .contacts
    @State private var isSearchPresented: Bool = false
    @State private var selectedContact: Contact?
    @State private var selectedExperience: Experience?

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
                        // Touching away closes the search bar only when not actively searching
                        if isSearchPresented && query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            isSearchPresented = false
                        }
                    }
                )
                .tabBarMinimizeBehaviorOnScroll()
                .dismissKeyboardOnTap()
            }
            .navigationTitle(tr("tab.search"))
            .navigationBarTitleDisplayMode(.large)
            .searchable(
                text: Binding(
                    get: { query },
                    set: { newValue in
                        if !query.isEmpty && newValue.isEmpty {
                            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        }
                        query = newValue
                    }
                ),
                isPresented: Binding(
                    get: { isSearchPresented },
                    set: { newValue in
                        if isSearchPresented != newValue {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        }
                        isSearchPresented = newValue
                    }
                ),
                placement: .automatic,
                prompt: Text(tr("search.placeholder"))
            )
            .onChange(of: query) { oldValue, newValue in
                if !oldValue.isEmpty && newValue.isEmpty {
                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                }
            }
            .searchScopes(Binding(
                get: { scope },
                set: { newValue in
                    guard newValue != scope else { return }
                    UISelectionFeedbackGenerator().selectionChanged()
                    scope = newValue
                }
            )) {
                ForEach(FilterScope.allCases, id: \.self) { item in
                    Text(item.localizedName).tag(item)
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
        }
    }

    // MARK: - Results Section
    private var resultsSection: some View {
        let results = state.search(query: query)

        return VStack(spacing: 18) {
            if isScopeEmpty(results) {
                GlassEmptyStateView(
                    systemImage: scopeIcon,
                    title: scope.emptyResultTitle,
                    subtitle: tr("search.tryDifferent")
                )
                .padding(.top, 24)
            } else {
                // Contacts
                if scope == .contacts && !results.contacts.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("\(tr("search.scope.contacts")) (\(results.contacts.count))")
                            .font(.headline)
                            .foregroundColor(.primary)

                        LazyVStack(spacing: 10) {
                            ForEach(results.contacts) { contact in
                                SearchResultRow(
                                    systemImage: "person.fill",
                                    title: contact.name,
                                    itemId: contact.id,
                                    balance: state.contactBalance(contact.id),
                                    isMasked: state.isAmountsHidden,
                                    subtitle: contact.phone,
                                    onTap: {
                                        selectedContact = contact
                                    }
                                )
                            }
                        }
                    }
                }

                // Experiences
                if scope == .experiences && !results.experiences.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("\(tr("search.scope.experiences")) (\(results.experiences.count))")
                            .font(.headline)
                            .foregroundColor(.primary)

                        LazyVStack(spacing: 10) {
                            ForEach(results.experiences) { exp in
                                let txCount = state.experienceTransactions(exp.id).count
                                SearchResultRow(
                                    systemImage: "safari.fill",
                                    title: exp.name,
                                    itemId: exp.id,
                                    balance: state.experienceBalance(exp.id),
                                    isMasked: state.isAmountsHidden,
                                    subtitle: "\(txCount) transaction\(txCount == 1 ? "" : "s")",
                                    badgeTitle: exp.closed ? tr("experience.statusClosed") : nil,
                                    onTap: {
                                        selectedExperience = exp
                                    }
                                )
                            }
                        }
                    }
                }

                // Transactions
                if scope == .transactions && !results.transactions.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("\(tr("search.scope.transactions")) (\(results.transactions.count))")
                            .font(.headline)
                            .foregroundColor(.primary)

                        LazyVStack(spacing: 10) {
                            ForEach(results.transactions) { tx in
                                TransactionRowView(
                                    transaction: tx,
                                    isMasked: state.isAmountsHidden,
                                    showsActions: false,
                                    onEdit: {},
                                    onDelete: {}
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

    // MARK: - Initial State
    private var recentOrEmptyState: some View {
        VStack(spacing: 16) {
            GlassEmptyStateView(
                systemImage: "magnifyingglass.circle.fill",
                title: tr("search.quickTitle"),
                subtitle: tr("search.quickSubtitle")
            )
            .padding(.top, 16)
        }
    }
}
