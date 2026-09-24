import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("contacts", () => {
  it("list - returns empty array when unauthenticated or invalid notebook", async () => {
    const t = convexTest(schema);
    const userId = await t.run((ctx) => ctx.db.insert("users", { name: "User" }));
    const nbId = await t.run((ctx) => ctx.db.insert("notebooks", { userId, name: "Book", createdAt: 1 }));

    // Unauthenticated
    const listUnauth = await t.query(api.contacts.list, { notebookId: nbId });
    expect(listUnauth).toEqual([]);

    // Other user notebook
    const otherUser = await t.run((ctx) => ctx.db.insert("users", { name: "Other" }));
    const asOther = t.withIdentity({ subject: otherUser });
    const listOther = await asOther.query(api.contacts.list, { notebookId: nbId });
    expect(listOther).toEqual([]);
  });

  it("create, update, and list contacts with balances and experiences", async () => {
    const t = convexTest(schema);
    const userId = await t.run((ctx) => ctx.db.insert("users", { name: "User" }));
    const asUser = t.withIdentity({ subject: userId });

    const nbId = await asUser.mutation(api.notebooks.create, { name: "Book" });

    // Validation
    await expect(t.mutation(api.contacts.create, { notebookId: nbId, name: "No Auth" })).rejects.toThrow("Not authenticated");
    await expect(asUser.mutation(api.contacts.create, { notebookId: nbId, name: "   " })).rejects.toThrow("Invalid contact name");
    await expect(asUser.mutation(api.contacts.create, { notebookId: nbId, name: "A".repeat(201) })).rejects.toThrow("Invalid contact name");

    const otherUser = await t.run((ctx) => ctx.db.insert("users", { name: "Other" }));
    const asOther = t.withIdentity({ subject: otherUser });
    await expect(asOther.mutation(api.contacts.create, { notebookId: nbId, name: "Alice" })).rejects.toThrow("Notebook not found");

    // Create valid contact
    const contactId = await asUser.mutation(api.contacts.create, {
      notebookId: nbId,
      name: "Alice",
      phone: "+212600000000",
    });
    expect(contactId).toBeDefined();

    // Direct transactions
    await t.run(async (ctx) => {
      await ctx.db.insert("transactions", {
        userId,
        notebookId: nbId,
        contactId,
        amount: 100,
        createdAt: 100,
      });
      await ctx.db.insert("transactions", {
        userId,
        notebookId: nbId,
        contactId,
        amount: -40,
        date: 200,
        createdAt: 150,
      });
    });

    // Closed experience linked to contact
    const expId = await t.run(async (ctx) => {
      return await ctx.db.insert("experiences", {
        userId,
        notebookId: nbId,
        name: "Trip",
        contactId,
        closed: true,
        createdAt: 100,
      });
    });
    await t.run(async (ctx) => {
      await ctx.db.insert("transactions", {
        userId,
        notebookId: nbId,
        experienceId: expId,
        amount: 300,
        date: 300,
        createdAt: 300,
      });
    });

    // Query list
    const list = await asUser.query(api.contacts.list, { notebookId: nbId });
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Alice");
    expect(list[0].balance).toBe(60 + 300); // direct 60 + exp 300
    expect(list[0].transactionCount).toBe(2);
    expect(list[0].lastTransactionDate).toBe(200);
    expect(list[0].experiences).toHaveLength(1);
    expect(list[0].experiences[0].balance).toBe(300);

    // Update contact
    await expect(t.mutation(api.contacts.update, { id: contactId, name: "New" })).rejects.toThrow("Not authenticated");
    await expect(asUser.mutation(api.contacts.update, { id: contactId, name: "" })).rejects.toThrow("Invalid contact name");
    await expect(asOther.mutation(api.contacts.update, { id: contactId, name: "Other" })).rejects.toThrow("Contact not found");

    await asUser.mutation(api.contacts.update, { id: contactId, name: "Alice Smith", phone: "+212611111111" });
    const updatedList = await asUser.query(api.contacts.list, { notebookId: nbId });
    expect(updatedList[0].name).toBe("Alice Smith");
    expect(updatedList[0].phone).toBe("+212611111111");
  });

  it("remove - cascades deletion and unlinks experiences", async () => {
    const t = convexTest(schema);
    const userId = await t.run((ctx) => ctx.db.insert("users", { name: "User" }));
    const asUser = t.withIdentity({ subject: userId });

    const nbId = await asUser.mutation(api.notebooks.create, { name: "Book" });
    const contactId = await asUser.mutation(api.contacts.create, { notebookId: nbId, name: "Bob" });

    const txId = await t.run((ctx) =>
      ctx.db.insert("transactions", { userId, notebookId: nbId, contactId, amount: 50, createdAt: 1 })
    );
    const expId = await t.run((ctx) =>
      ctx.db.insert("experiences", { userId, notebookId: nbId, contactId, name: "Event", closed: false, createdAt: 1 })
    );

    // Unauthenticated and unauthorized remove
    await expect(t.mutation(api.contacts.remove, { id: contactId })).rejects.toThrow("Not authenticated");
    const otherUser = await t.run((ctx) => ctx.db.insert("users", { name: "Other" }));
    await expect(t.withIdentity({ subject: otherUser }).mutation(api.contacts.remove, { id: contactId })).rejects.toThrow("Contact not found");

    // Remove
    await asUser.mutation(api.contacts.remove, { id: contactId });

    await t.run(async (ctx) => {
      expect(await ctx.db.get(contactId)).toBeNull();
      expect(await ctx.db.get(txId)).toBeNull();
      const exp = await ctx.db.get(expId);
      expect(exp?.contactId).toBeUndefined();
    });
  });
});
