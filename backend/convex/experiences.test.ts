import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("experiences", () => {
  it("list - returns empty when unauthenticated", async () => {
    const t = convexTest(schema);
    const userId = await t.run((ctx) => ctx.db.insert("users", { name: "User" }));
    const nbId = await t.run((ctx) => ctx.db.insert("notebooks", { userId, name: "Book", createdAt: 1 }));

    const list = await t.query(api.experiences.list, { notebookId: nbId });
    expect(list).toEqual([]);
  });

  it("create, update, close, reopen, and list experiences", async () => {
    const t = convexTest(schema);
    const userId = await t.run((ctx) => ctx.db.insert("users", { name: "User" }));
    const otherUser = await t.run((ctx) => ctx.db.insert("users", { name: "Other" }));
    const asUser = t.withIdentity({ subject: userId });
    const asOther = t.withIdentity({ subject: otherUser });

    const nbId = await asUser.mutation(api.notebooks.create, { name: "Book" });
    const contactId = await asUser.mutation(api.contacts.create, { notebookId: nbId, name: "Alice" });

    // Validation
    await expect(t.mutation(api.experiences.create, { notebookId: nbId, name: "Test" })).rejects.toThrow("Not authenticated");
    await expect(asUser.mutation(api.experiences.create, { notebookId: nbId, name: " " })).rejects.toThrow("Invalid experience name");
    await expect(asUser.mutation(api.experiences.create, { notebookId: nbId, name: "A".repeat(201) })).rejects.toThrow("Invalid experience name");
    await expect(asOther.mutation(api.experiences.create, { notebookId: nbId, name: "Test" })).rejects.toThrow("Notebook not found");

    // Contact in other notebook
    const otherNb = await asOther.mutation(api.notebooks.create, { name: "Other Book" });
    const otherContact = await asOther.mutation(api.contacts.create, { notebookId: otherNb, name: "Charlie" });
    await expect(asUser.mutation(api.experiences.create, { notebookId: nbId, name: "Test", contactId: otherContact })).rejects.toThrow("Contact not found");

    // Create valid experience
    const expId = await asUser.mutation(api.experiences.create, {
      notebookId: nbId,
      name: "Dinner Party",
      contactId,
    });
    expect(expId).toBeDefined();

    // Add transactions
    await t.run(async (ctx) => {
      await ctx.db.insert("transactions", {
        userId,
        notebookId: nbId,
        experienceId: expId,
        amount: 150,
        createdAt: 100,
      });
      await ctx.db.insert("transactions", {
        userId,
        notebookId: nbId,
        experienceId: expId,
        amount: 50,
        date: 200,
        createdAt: 150,
      });
    });

    let list = await asUser.query(api.experiences.list, { notebookId: nbId });
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Dinner Party");
    expect(list[0].balance).toBe(200);
    expect(list[0].transactionCount).toBe(2);
    expect(list[0].lastTransactionDate).toBe(200);
    expect(list[0].closed).toBe(false);

    // Update experience
    await expect(t.mutation(api.experiences.update, { id: expId, name: "New" })).rejects.toThrow("Not authenticated");
    await expect(asUser.mutation(api.experiences.update, { id: expId, name: "" })).rejects.toThrow("Invalid experience name");
    await expect(asOther.mutation(api.experiences.update, { id: expId, name: "New" })).rejects.toThrow("Experience not found");
    await expect(asUser.mutation(api.experiences.update, { id: expId, name: "New", contactId: otherContact })).rejects.toThrow("Contact not found");

    await asUser.mutation(api.experiences.update, { id: expId, name: "Gala Dinner" });
    list = await asUser.query(api.experiences.list, { notebookId: nbId });
    expect(list[0].name).toBe("Gala Dinner");

    // Close and Reopen
    await expect(t.mutation(api.experiences.close, { id: expId })).rejects.toThrow("Not authenticated");
    await expect(asOther.mutation(api.experiences.close, { id: expId })).rejects.toThrow("Experience not found");
    await asUser.mutation(api.experiences.close, { id: expId });
    list = await asUser.query(api.experiences.list, { notebookId: nbId });
    expect(list[0].closed).toBe(true);

    await expect(t.mutation(api.experiences.reopen, { id: expId })).rejects.toThrow("Not authenticated");
    await expect(asOther.mutation(api.experiences.reopen, { id: expId })).rejects.toThrow("Experience not found");
    await asUser.mutation(api.experiences.reopen, { id: expId });
    list = await asUser.query(api.experiences.list, { notebookId: nbId });
    expect(list[0].closed).toBe(false);
  });

  it("transfer - moves experience and its transactions between notebooks", async () => {
    const t = convexTest(schema);
    const userId = await t.run((ctx) => ctx.db.insert("users", { name: "User" }));
    const otherUser = await t.run((ctx) => ctx.db.insert("users", { name: "Other" }));
    const asUser = t.withIdentity({ subject: userId });
    const asOther = t.withIdentity({ subject: otherUser });

    const nb1 = await asUser.mutation(api.notebooks.create, { name: "Book 1" });
    const nb2 = await asUser.mutation(api.notebooks.create, { name: "Book 2" });
    const contactId = await asUser.mutation(api.contacts.create, { notebookId: nb1, name: "Alice" });

    const expId = await asUser.mutation(api.experiences.create, {
      notebookId: nb1,
      name: "Road Trip",
      contactId,
    });
    const txId = await t.run((ctx) =>
      ctx.db.insert("transactions", {
        userId,
        notebookId: nb1,
        contactId,
        experienceId: expId,
        amount: 100,
        createdAt: 1,
      })
    );

    // Auth & validation checks
    await expect(t.mutation(api.experiences.transfer, { id: expId, targetNotebookId: nb2 })).rejects.toThrow("Not authenticated");
    await expect(asOther.mutation(api.experiences.transfer, { id: expId, targetNotebookId: nb2 })).rejects.toThrow("Experience not found");
    await expect(asUser.mutation(api.experiences.transfer, { id: expId, targetNotebookId: nb1 })).rejects.toThrow("Already in this notebook");

    const otherNb = await asOther.mutation(api.notebooks.create, { name: "Other Book" });
    await expect(asUser.mutation(api.experiences.transfer, { id: expId, targetNotebookId: otherNb })).rejects.toThrow("Target notebook not found");

    // Perform transfer
    await asUser.mutation(api.experiences.transfer, { id: expId, targetNotebookId: nb2 });

    await t.run(async (ctx) => {
      const exp = await ctx.db.get(expId);
      expect(exp?.notebookId).toBe(nb2);
      expect(exp?.contactId).toBeUndefined();

      const tx = await ctx.db.get(txId);
      expect(tx?.notebookId).toBe(nb2);
      expect(tx?.contactId).toBeUndefined();
    });
  });

  it("remove - cascades deletion of linked transactions", async () => {
    const t = convexTest(schema);
    const userId = await t.run((ctx) => ctx.db.insert("users", { name: "User" }));
    const asUser = t.withIdentity({ subject: userId });

    const nbId = await asUser.mutation(api.notebooks.create, { name: "Book" });
    const expId = await asUser.mutation(api.experiences.create, { notebookId: nbId, name: "Event" });
    const txId = await t.run((ctx) =>
      ctx.db.insert("transactions", { userId, notebookId: nbId, experienceId: expId, amount: 200, createdAt: 1 })
    );

    // Authorization checks
    await expect(t.mutation(api.experiences.remove, { id: expId })).rejects.toThrow("Not authenticated");
    const otherUser = await t.run((ctx) => ctx.db.insert("users", { name: "Other" }));
    await expect(t.withIdentity({ subject: otherUser }).mutation(api.experiences.remove, { id: expId })).rejects.toThrow("Experience not found");

    // Remove
    await asUser.mutation(api.experiences.remove, { id: expId });

    await t.run(async (ctx) => {
      expect(await ctx.db.get(expId)).toBeNull();
      expect(await ctx.db.get(txId)).toBeNull();
    });
  });
});
