import SwiftUI
import Combine

// MARK: - Synchronous View Callbacks + Async CRUD Actions
// Every mutation funnels through `runMutation` (offline-sync aware) and is
// followed by a debounced refresh.
extension AppState {
    // Synchronous view callbacks forward work to the async backend operations below.
    public func createNotebook(name: String) { Task { await createNotebook(name: name) } }
    public func updateNotebook(id: String, name: String) { Task { await updateNotebook(id: id, name: name) } }
    public func archiveNotebook(id: String, archived: Bool) { Task { await archiveNotebook(id: id, archived: archived) } }
    public func reorderNotebooks(orderedIds: [String]) { Task { await reorderNotebooks(orderedIds: orderedIds) } }
    public func deleteNotebook(id: String) { Task { await deleteNotebook(id: id) } }

    public func createContact(notebookId: String, name: String, phone: String? = nil) {
        Task { await createContact(notebookId: notebookId, name: name, phone: phone) }
    }
    public func updateContact(id: String, name: String, phone: String? = nil) {
        Task { await updateContact(id: id, name: name, phone: phone) }
    }
    public func deleteContact(id: String) { Task { await deleteContact(id: id) } }

    public func createExperience(notebookId: String, name: String, contactId: String? = nil) {
        Task { await createExperience(notebookId: notebookId, name: name, contactId: contactId) }
    }
    public func updateExperience(id: String, name: String, contactId: String? = nil) {
        Task { await updateExperience(id: id, name: name, contactId: contactId) }
    }
    public func toggleExperienceClosed(id: String) { Task { await toggleExperienceClosed(id: id) } }
    public func transferExperience(id: String, to targetNotebookId: String) {
        Task { await transferExperience(id: id, to: targetNotebookId) }
    }
    public func deleteExperience(id: String) { Task { await deleteExperience(id: id) } }

    public func createTransaction(
        notebookId: String, contactId: String? = nil, experienceId: String? = nil,
        amount: Double, description: String? = nil, date: Date = Date()
    ) {
        Task {
            await createTransaction(
                notebookId: notebookId, contactId: contactId, experienceId: experienceId,
                amount: amount, description: description, date: date
            )
        }
    }
    public func updateTransaction(id: String, amount: Double, description: String? = nil, date: Date) {
        Task { await updateTransaction(id: id, amount: amount, description: description, date: date) }
    }
    public func deleteTransaction(id: String) { Task { await deleteTransaction(id: id) } }

    // MARK: - Notebook actions

    public func createNotebook(name: String) async {
        let trimmed = String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(20))
        guard !trimmed.isEmpty else { return }
        do {
            let data = try await runMutation("notebooks:create", args: ["name": trimmed])
            let id = try JSONDecoder().decode(String.self, from: data)
            activeNotebookId = id
            defaults.set(id, forKey: activeNotebookKey)
            await refreshAfterMutation()
        } catch {
            appError = error.localizedDescription
        }
    }

    public func updateNotebook(id: String, name: String) async {
        let trimmed = String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(20))
        guard !trimmed.isEmpty else { return }
        do {
            _ = try await runMutation("notebooks:update", args: ["id": id, "name": trimmed])
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    public func archiveNotebook(id: String, archived: Bool) async {
        do {
            _ = try await runMutation("notebooks:archive", args: ["id": id, "archived": archived])
            await refreshAfterMutation()
            if archived, activeNotebookId == id {
                let next = activeNotebooksList.first?.id
                activeNotebookId = next
                if let next {
                    defaults.set(next, forKey: activeNotebookKey)
                } else {
                    defaults.removeObject(forKey: activeNotebookKey)
                }
            }
        } catch { appError = error.localizedDescription }
    }

    public func reorderNotebooks(orderedIds: [String]) async {
        for (index, id) in orderedIds.enumerated() {
            if let notebookIndex = notebooks.firstIndex(where: { $0.id == id }) {
                notebooks[notebookIndex].order = index
            }
        }
        do {
            _ = try await runMutation("notebooks:reorder", args: ["ids": orderedIds])
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    public func deleteNotebook(id: String) async {
        do {
            _ = try await runMutation("notebooks:remove", args: ["id": id])
            await refreshAfterMutation()
            if activeNotebookId == id {
                let next = activeNotebooksList.first?.id
                activeNotebookId = next
                if let next {
                    defaults.set(next, forKey: activeNotebookKey)
                } else {
                    defaults.removeObject(forKey: activeNotebookKey)
                }
            }
        } catch { appError = error.localizedDescription }
    }

    // MARK: - Contact actions

    public func createContact(notebookId: String, name: String, phone: String? = nil) async {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanName.isEmpty else { return }
        do {
            var args: [String: Any] = ["notebookId": notebookId, "name": cleanName]
            let cleanPhone = phone?.trimmingCharacters(in: .whitespacesAndNewlines)
            if let cleanPhone, !cleanPhone.isEmpty { args["phone"] = cleanPhone }
            _ = try await runMutation("contacts:create", args: args)
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    public func updateContact(id: String, name: String, phone: String? = nil) async {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanName.isEmpty else { return }
        do {
            var args: [String: Any] = ["id": id, "name": cleanName]
            let cleanPhone = phone?.trimmingCharacters(in: .whitespacesAndNewlines)
            if let cleanPhone, !cleanPhone.isEmpty { args["phone"] = cleanPhone }
            _ = try await runMutation("contacts:update", args: args)
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    public func deleteContact(id: String) async {
        do {
            _ = try await runMutation("contacts:remove", args: ["id": id])
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    // MARK: - Experience actions

    public func createExperience(notebookId: String, name: String, contactId: String? = nil) async {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanName.isEmpty else { return }
        do {
            var args: [String: Any] = ["notebookId": notebookId, "name": cleanName]
            if let contactId, !contactId.isEmpty { args["contactId"] = contactId }
            _ = try await runMutation("experiences:create", args: args)
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    public func updateExperience(id: String, name: String, contactId: String? = nil) async {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanName.isEmpty else { return }
        do {
            var args: [String: Any] = ["id": id, "name": cleanName]
            if let contactId, !contactId.isEmpty { args["contactId"] = contactId }
            _ = try await runMutation("experiences:update", args: args)
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    public func toggleExperienceClosed(id: String) async {
        guard let experience = experiences.first(where: { $0.id == id }) else { return }
        do {
            _ = try await runMutation(experience.closed ? "experiences:reopen" : "experiences:close", args: ["id": id])
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    public func transferExperience(id: String, to targetNotebookId: String) async {
        do {
            _ = try await runMutation("experiences:transfer", args: ["id": id, "targetNotebookId": targetNotebookId])
            await refreshAfterMutation()
            if transferRedirect { activeNotebookId = targetNotebookId }
        } catch { appError = error.localizedDescription }
    }

    public func deleteExperience(id: String) async {
        do {
            _ = try await runMutation("experiences:remove", args: ["id": id])
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    // MARK: - Transaction actions

    public func createTransaction(
        notebookId: String,
        contactId: String? = nil,
        experienceId: String? = nil,
        amount: Double,
        description: String? = nil,
        date: Date = Date()
    ) async {
        guard abs(amount) > 0.0001 else { return }
        let cleanDescription = description?.trimmingCharacters(in: .whitespacesAndNewlines)
        var args: [String: Any] = [
            "notebookId": notebookId,
            "amount": amount,
            "date": date.timeIntervalSince1970 * 1000
        ]
        if let contactId, !contactId.isEmpty { args["contactId"] = contactId }
        if let experienceId, !experienceId.isEmpty { args["experienceId"] = experienceId }
        if let cleanDescription, !cleanDescription.isEmpty { args["description"] = cleanDescription }
        do {
            _ = try await runMutation("transactions:create", args: args)
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    public func updateTransaction(id: String, amount: Double, description: String? = nil, date: Date) async {
        guard abs(amount) > 0.0001 else { return }
        let cleanDescription = description?.trimmingCharacters(in: .whitespacesAndNewlines)
        var args: [String: Any] = ["id": id, "amount": amount, "date": date.timeIntervalSince1970 * 1000]
        if let cleanDescription, !cleanDescription.isEmpty { args["description"] = cleanDescription }
        do {
            _ = try await runMutation("transactions:update", args: args)
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }

    public func deleteTransaction(id: String) async {
        do {
            _ = try await runMutation("transactions:remove", args: ["id": id])
            await refreshAfterMutation()
        } catch { appError = error.localizedDescription }
    }
}
