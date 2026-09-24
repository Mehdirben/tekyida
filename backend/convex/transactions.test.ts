import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("transactions", () => {
  it("list - returns empty when unauthenticated or missing arguments", async () => {
    const t = convexTest(schema);
    const userId = await t.run((ctx) => ctx.db.insert("users", { name: "User" }));
    const asUser = t.withIdentity({ subject: userId });

    expect(await t.query(api.transactions.list, {})).toEqual([]);
    expect(await asUser.query(api.transactions.list, {})).toEqual([]);
  });

  it("create, list, update, and remove transactions", async () => {
    const t = convexTest(schema);
    const userId = await t.run((ctx) => ctx.db.insert("users", { name: "User" }));
    const otherUser = await t.run((ctx) => ctx.db.insert("users", { name: "Other" }));
    const asUser = t.withIdentity({ subject: userId });
    const asOther = t.withIdentity({ subject: otherUser });

    const nbId = await asUser.mutation(api.notebooks.create, { name: "Book" });
    const contactId = await asUser.mutation(api.contacts.create, { notebookId: nbId, name: "Alice" });
    const expId = await asUser.mutation(api.experiences.create, { notebookId: nbId, name: "Trip" });

    // Validation
    await expect(t.mutation(api.transactions.create, { notebookId: nbId, amount: 100 })).rejects.toThrow("Not authenticated");
    await expect(asUser.mutation(api.transactions.create, { notebookId: nbId, amount: 0 })).rejects.toThrow("Invalid amount");
    await expect(asUser.mutation(api.transactions.create, { notebookId: nbId, amount: Infinity })).rejects.toThrow("Invalid amount");
    await expect(asUser.mutation(api.transactions.create, { notebookId: nbId, amount: 10, description: "X".repeat(501) })).rejects.toThrow("Description too long");
    await expect(asOther.mutation(api.transactions.create, { notebookId: nbId, amount: 10 })).rejects.toThrow("Notebook not found");

    // Contact and experience mismatch
    const otherNb = await asOther.mutation(api.notebooks.create, { name: "Other Book" });
    const otherContact = await asOther.mutation(api.contacts.create, { notebookId: otherNb, name: "Bob" });
    const otherExp = await asOther.mutation(api.experiences.create, { notebookId: otherNb, name: "Party" });

    await expect(asUser.mutation(api.transactions.create, { notebookId: nbId, contactId: otherContact, amount: 10 })).rejects.toThrow("Contact not found");
    await expect(asUser.mutation(api.transactions.create, { notebookId: nbId, experienceId: otherExp, amount: 10 })).rejects.toThrow("Experience not found");

    // Block when experience is closed
    await asUser.mutation(api.experiences.close, { id: expId });
    await expect(asUser.mutation(api.transactions.create, { notebookId: nbId, experienceId: expId, amount: 10 })).rejects.toThrow("Experience is closed");
    await asUser.mutation(api.experiences.reopen, { id: expId });

    // Create valid direct contact transaction
    const txContactId = await asUser.mutation(api.transactions.create, {
      notebookId: nbId,
      contactId,
      amount: 150,
      description: "Lunch",
      date: 1000,
    });
    expect(txContactId).toBeDefined();

    // Create valid experience transaction
    const txExpId = await asUser.mutation(api.transactions.create, {
      notebookId: nbId,
      experienceId: expId,
      contactId,
      amount: 300,
      description: "Gas",
    });
    expect(txExpId).toBeDefined();

    // List by contact (should only return direct transactions)
    const contactTxList = await asUser.query(api.transactions.list, { contactId });
    expect(contactTxList).toHaveLength(1);
    expect(contactTxList[0]._id).toBe(txContactId);

    // List by experience
    const expTxList = await asUser.query(api.transactions.list, { experienceId: expId });
    expect(expTxList).toHaveLength(1);
    expect(expTxList[0]._id).toBe(txExpId);

    // Update transaction
    await expect(t.mutation(api.transactions.update, { id: txContactId, amount: 120 })).rejects.toThrow("Not authenticated");
    await expect(asOther.mutation(api.transactions.update, { id: txContactId, amount: 120 })).rejects.toThrow("Transaction not found");
    await expect(asUser.mutation(api.transactions.update, { id: txContactId, amount: 0 })).rejects.toThrow("Invalid amount");
    await expect(asUser.mutation(api.transactions.update, { id: txContactId, amount: 10, description: "A".repeat(501) })).rejects.toThrow("Description too long");

    await asUser.mutation(api.transactions.update, { id: txContactId, amount: 180, description: "Updated Lunch", date: 1500 });
    const updatedTx = await asUser.query(api.transactions.list, { contactId });
    expect(updatedTx[0].amount).toBe(180);
    expect(updatedTx[0].description).toBe("Updated Lunch");

    // Close experience and try to update/remove linked transaction
    await asUser.mutation(api.experiences.close, { id: expId });
    await expect(asUser.mutation(api.transactions.update, { id: txExpId, amount: 500 })).rejects.toThrow("Experience is closed");
    await expect(asUser.mutation(api.transactions.remove, { id: txExpId })).rejects.toThrow("Experience is closed");
    await asUser.mutation(api.experiences.reopen, { id: expId });
    // Update and remove linked to open experience
    await asUser.mutation(api.transactions.update, { id: txExpId, amount: 450 });
    await asUser.mutation(api.transactions.remove, { id: txExpId });

    // Remove transactions
    await expect(t.mutation(api.transactions.remove, { id: txContactId })).rejects.toThrow("Not authenticated");
    await expect(asOther.mutation(api.transactions.remove, { id: txContactId })).rejects.toThrow("Transaction not found");

    await asUser.mutation(api.transactions.remove, { id: txContactId });
    const listAfterDelete = await asUser.query(api.transactions.list, { contactId });
    expect(listAfterDelete).toHaveLength(0);
  });
});
