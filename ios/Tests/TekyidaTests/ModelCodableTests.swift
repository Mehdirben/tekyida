import Testing
import Foundation
@testable import Tekyida

@Suite("Model Codable Contract")
struct ModelCodableTests {
    // MARK: - Notebook

    @Test("Notebook decodes Convex JSON: _id key, millisecond dates, archived default")
    func notebookDecode() throws {
        let json = #"{"_id":"nb_server","name":"Trip","order":2,"createdAt":1700000000000}"#
        let notebook = try JSONDecoder().decode(Notebook.self, from: Data(json.utf8))
        #expect(notebook.id == "nb_server")
        #expect(notebook.name == "Trip")
        #expect(notebook.order == 2)
        #expect(notebook.archived == false, "Missing archived key must default to false")
        #expect(notebook.createdAt == Date(timeIntervalSince1970: 1_700_000_000))
    }

    @Test("Notebook encodes back to the Convex contract")
    func notebookEncodeRoundTrip() throws {
        let original = Notebook(id: "nb1", name: "Trip", order: nil, archived: true, createdAt: Date(timeIntervalSince1970: 1_700_000_000))
        let data = try JSONEncoder().encode(original)
        let dict = try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
        #expect(dict["_id"] as? String == "nb1")
        #expect(dict["archived"] as? Bool == true)
        #expect(dict["createdAt"] as? Double == 1_700_000_000_000)
        #expect(dict["order"] == nil, "nil order must be omitted")

        let roundTripped = try JSONDecoder().decode(Notebook.self, from: data)
        #expect(roundTripped == original)
    }

    // MARK: - Contact

    @Test("Contact decodes and round-trips with optional phone")
    func contactCodableRoundTrip() throws {
        let json = #"{"_id":"c1","notebookId":"nb1","name":"Alice","phone":"+212600","createdAt":1700000000000}"#
        let contact = try JSONDecoder().decode(Contact.self, from: Data(json.utf8))
        #expect(contact.id == "c1")
        #expect(contact.phone == "+212600")
        #expect(contact.createdAt == Date(timeIntervalSince1970: 1_700_000_000))

        let roundTripped = try JSONDecoder().decode(Contact.self, from: JSONEncoder().encode(contact))
        #expect(roundTripped == contact)

        var withoutPhone = contact
        withoutPhone.phone = nil
        let dict = try #require(try JSONSerialization.jsonObject(with: JSONEncoder().encode(withoutPhone)) as? [String: Any])
        #expect(dict["phone"] == nil, "nil phone must be omitted")
    }

    // MARK: - Experience

    @Test("Experience decodes and round-trips with closed flag")
    func experienceCodableRoundTrip() throws {
        let json = #"{"_id":"e1","notebookId":"nb1","contactId":"c1","name":"Dinner","closed":true,"createdAt":1700000000000}"#
        let experience = try JSONDecoder().decode(Experience.self, from: Data(json.utf8))
        #expect(experience.id == "e1")
        #expect(experience.contactId == "c1")
        #expect(experience.closed == true)

        let roundTripped = try JSONDecoder().decode(Experience.self, from: JSONEncoder().encode(experience))
        #expect(roundTripped == experience)

        let withoutContact = Experience(id: "e2", notebookId: "nb1", contactId: nil, name: "Solo")
        let dict = try #require(try JSONSerialization.jsonObject(with: JSONEncoder().encode(withoutContact)) as? [String: Any])
        #expect(dict["contactId"] == nil)
    }

    // MARK: - Transaction

    @Test("Transaction date falls back to createdAt when absent")
    func transactionDateFallback() throws {
        let json = #"{"_id":"t1","notebookId":"nb1","amount":120.5,"createdAt":1700000000000}"#
        let transaction = try JSONDecoder().decode(Transaction.self, from: Data(json.utf8))
        #expect(transaction.amount == 120.5)
        #expect(transaction.date == Date(timeIntervalSince1970: 1_700_000_000),
                "Absent date must fall back to createdAt")
        #expect(transaction.createdAt == Date(timeIntervalSince1970: 1_700_000_000))
    }

    @Test("Transaction preserves distinct date and round-trips")
    func transactionCodableRoundTrip() throws {
        let json = #"{"_id":"t1","notebookId":"nb1","experienceId":"e1","amount":-40,"description":"Taxi","date":1700000050000,"createdAt":1700000000000}"#
        let transaction = try JSONDecoder().decode(Transaction.self, from: Data(json.utf8))
        #expect(transaction.date == Date(timeIntervalSince1970: 1_700_000_050))
        #expect(transaction.createdAt == Date(timeIntervalSince1970: 1_700_000_000))

        let data = try JSONEncoder().encode(transaction)
        let dict = try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
        #expect(dict["date"] as? Double == 1_700_000_050_000)
        #expect(dict["createdAt"] as? Double == 1_700_000_000_000)

        let roundTripped = try JSONDecoder().decode(Transaction.self, from: data)
        #expect(roundTripped == transaction)
    }

    // MARK: - Settings enums

    @Test("App language and theme raw values are stable")
    func settingsEnumRawValues() {
        #expect(AppLanguage.english.rawValue == "en")
        #expect(AppLanguage.french.rawValue == "fr")
        #expect(AppThemeMode.system.rawValue == "system")
        #expect(AppThemeMode.light.rawValue == "light")
        #expect(AppThemeMode.dark.rawValue == "dark")
        #expect(AppLanguage.allCases.count == 2)
        #expect(AppThemeMode.allCases.count == 3)
    }
}
