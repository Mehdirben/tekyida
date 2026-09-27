import Foundation

// MARK: - Optimistic Local Application of Mutations
// Mirrors backend mutation effects on the local arrays so the UI stays
// consistent while offline, and validates queued writes against local rules.
extension AppState {
    func applyOfflineMutation(_ path: String, args: [String: Any], localCreatedId: String?) {
        switch path {
        case "notebooks:create":
            guard let id = localCreatedId, let name = args["name"] as? String else { return }
            notebooks.insert(Notebook(id: id, name: name), at: 0)
            if activeNotebookId == nil { activeNotebookId = id }
        case "notebooks:update":
            guard let id = args["id"] as? String, let index = notebooks.firstIndex(where: { $0.id == id }),
                  let name = args["name"] as? String else { return }
            notebooks[index].name = name
        case "notebooks:archive":
            guard let id = args["id"] as? String, let index = notebooks.firstIndex(where: { $0.id == id }),
                  let archived = args["archived"] as? Bool else { return }
            notebooks[index].archived = archived
            if archived && activeNotebookId == id {
                activeNotebookId = activeNotebooksList.first(where: { $0.id != id })?.id
            }
        case "notebooks:remove":
            guard let id = args["id"] as? String else { return }
            notebooks.removeAll { $0.id == id }
            contacts.removeAll { $0.notebookId == id }
            experiences.removeAll { $0.notebookId == id }
            transactions.removeAll { $0.notebookId == id }
            if activeNotebookId == id { activeNotebookId = activeNotebooksList.first?.id }
        case "notebooks:reorder":
            guard let ids = args["ids"] as? [String] else { return }
            for index in notebooks.indices {
                if let order = ids.firstIndex(of: notebooks[index].id) { notebooks[index].order = order }
            }
        case "contacts:create":
            guard let id = localCreatedId, let notebookId = args["notebookId"] as? String,
                  let name = args["name"] as? String else { return }
            contacts.insert(Contact(id: id, notebookId: notebookId, name: name, phone: args["phone"] as? String), at: 0)
        case "contacts:update":
            guard let id = args["id"] as? String, let index = contacts.firstIndex(where: { $0.id == id }),
                  let name = args["name"] as? String else { return }
            contacts[index].name = name
            contacts[index].phone = args["phone"] as? String
        case "contacts:remove":
            guard let id = args["id"] as? String else { return }
            contacts.removeAll { $0.id == id }
            transactions.removeAll { $0.contactId == id }
            for index in experiences.indices where experiences[index].contactId == id {
                experiences[index].contactId = nil
            }
        case "experiences:create":
            guard let id = localCreatedId, let notebookId = args["notebookId"] as? String,
                  let name = args["name"] as? String else { return }
            experiences.insert(Experience(
                id: id, notebookId: notebookId, contactId: args["contactId"] as? String, name: name
            ), at: 0)
        case "experiences:update":
            guard let id = args["id"] as? String, let index = experiences.firstIndex(where: { $0.id == id }),
                  let name = args["name"] as? String else { return }
            experiences[index].name = name
            experiences[index].contactId = args["contactId"] as? String
        case "experiences:close", "experiences:reopen":
            guard let id = args["id"] as? String, let index = experiences.firstIndex(where: { $0.id == id }) else { return }
            experiences[index].closed = path == "experiences:close"
        case "experiences:transfer":
            guard let id = args["id"] as? String, let target = args["targetNotebookId"] as? String,
                  let index = experiences.firstIndex(where: { $0.id == id }) else { return }
            experiences[index].notebookId = target
            experiences[index].contactId = nil
            for txIndex in transactions.indices where transactions[txIndex].experienceId == id {
                transactions[txIndex].notebookId = target
                transactions[txIndex].contactId = nil
            }
        case "experiences:remove":
            guard let id = args["id"] as? String else { return }
            experiences.removeAll { $0.id == id }
            transactions.removeAll { $0.experienceId == id }
        case "transactions:create":
            guard let id = localCreatedId, let notebookId = args["notebookId"] as? String,
                  let amount = args["amount"] as? Double else { return }
            let ms = args["date"] as? Double ?? Date().timeIntervalSince1970 * 1000
            transactions.insert(Transaction(
                id: id, notebookId: notebookId, contactId: args["contactId"] as? String,
                experienceId: args["experienceId"] as? String, amount: amount,
                description: args["description"] as? String,
                date: Date(timeIntervalSince1970: ms / 1000)
            ), at: 0)
        case "transactions:update":
            guard let id = args["id"] as? String, let index = transactions.firstIndex(where: { $0.id == id }),
                  let amount = args["amount"] as? Double else { return }
            transactions[index].amount = amount
            transactions[index].description = args["description"] as? String
            if let milliseconds = args["date"] as? Double {
                transactions[index].date = Date(timeIntervalSince1970: milliseconds / 1000)
            }
        case "transactions:remove":
            guard let id = args["id"] as? String else { return }
            transactions.removeAll { $0.id == id }
        default:
            break
        }
    }

    func validateOfflineMutation(_ path: String, args: [String: Any]) throws {
        let experienceId: String?
        if path == "transactions:create" {
            experienceId = args["experienceId"] as? String
        } else if path == "transactions:update" || path == "transactions:remove" {
            guard let transactionId = args["id"] as? String,
                  let transaction = transactions.first(where: { $0.id == transactionId }) else { return }
            experienceId = transaction.experienceId
        } else {
            return
        }
        guard let experienceId,
              experiences.first(where: { $0.id == experienceId })?.closed == true else { return }
        throw BackendError.message("Transactions in a closed experience cannot be changed.")
    }
}
