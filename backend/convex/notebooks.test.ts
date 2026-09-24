import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("notebooks", () => {
  it("list - returns empty array when unauthenticated", async () => {
    const t = convexTest(schema);
    const list = await t.query(api.notebooks.list);
    expect(list).toEqual([]);
  });

  it("create - throws when not authenticated", async () => {
    const t = convexTest(schema);
    await expect(t.mutation(api.notebooks.create, { name: "Test" })).rejects.toThrow("Not authenticated");
  });

  it("create - validates name length and whitespace", async () => {
    const t = convexTest(schema);
    const userId = await t.run((ctx) => ctx.db.insert("users", { name: "User" }));
    const asUser = t.withIdentity({ subject: userId });

    await expect(asUser.mutation(api.notebooks.create, { name: "   " })).rejects.toThrow("Invalid notebook name");
    await expect(asUser.mutation(api.notebooks.create, { name: "A".repeat(21) })).rejects.toThrow("Invalid notebook name");
  });

  it("create, list, update, and reorder notebooks", async () => {
    const t = convexTest(schema);
    const userId = await t.run((ctx) => ctx.db.insert("users", { name: "User" }));
    const asUser = t.withIdentity({ subject: userId });

    // Create 2 notebooks
    const nb1 = await asUser.mutation(api.notebooks.create, { name: "First" });
    const nb2 = await asUser.mutation(api.notebooks.create, { name: "Second" });

    // Test sort fallback when order is equal
    await t.run(async (ctx) => {
      await ctx.db.patch(nb1, { order: 0, createdAt: 0 });
      await ctx.db.patch(nb2, { order: 0, createdAt: 2000 });
    });

    let list = await asUser.query(api.notebooks.list);
    expect(list[0]._id).toBe(nb2);
    expect(list[1]._id).toBe(nb1);

    await t.run(async (ctx) => {
      await ctx.db.patch(nb2, { order: 0, createdAt: 0 });
      await ctx.db.patch(nb1, { order: 0, createdAt: 1000 });
    });
    list = await asUser.query(api.notebooks.list);
    expect(list[0]._id).toBe(nb1);

    const nb3 = await asUser.mutation(api.notebooks.create, { name: "Third" });
    await t.run(async (ctx) => {
      await ctx.db.patch(nb1, { order: undefined, createdAt: 1000 });
      await ctx.db.patch(nb2, { order: 0, createdAt: 2000 });
      await ctx.db.patch(nb3, { order: undefined, createdAt: 3000 });
    });
    list = await asUser.query(api.notebooks.list);
    expect(list[0]._id).toBe(nb2);
    await asUser.mutation(api.notebooks.remove, { id: nb3 });

    // Add contact and transaction to nb1
    const c1 = await t.run((ctx) =>
      ctx.db.insert("contacts", {
        userId,
        notebookId: nb1,
        name: "Alice",
        createdAt: 100,
      })
    );
    await t.run((ctx) =>
      ctx.db.insert("transactions", {
        userId,
        notebookId: nb1,
        contactId: c1,
        amount: 250,
        createdAt: 200,
      })
    );

    list = await asUser.query(api.notebooks.list);
    expect(list).toHaveLength(2);
    const firstItem = list.find((n) => n._id === nb1);
    expect(firstItem?.contactCount).toBe(1);
    expect(firstItem?.balance).toBe(250);

    // Update notebook name
    await expect(asUser.mutation(api.notebooks.update, { id: nb1, name: "   " })).rejects.toThrow("Invalid notebook name");
    await asUser.mutation(api.notebooks.update, { id: nb1, name: "Updated First" });
    list = await asUser.query(api.notebooks.list);
    expect(list.find((n) => n._id === nb1)?.name).toBe("Updated First");

    // Reorder notebooks
    await asUser.mutation(api.notebooks.reorder, { ids: [nb2, nb1] });
    const reorderedList = await asUser.query(api.notebooks.list);
    expect(reorderedList[0]._id).toBe(nb2);
    expect(reorderedList[1]._id).toBe(nb1);

    // Archive notebook
    await asUser.mutation(api.notebooks.archive, { id: nb1, archived: true });
    const archivedList = await asUser.query(api.notebooks.list);
    expect(archivedList.find((n) => n._id === nb1)?.archived).toBe(true);
  });

  it("update, reorder, archive, and remove - authorization checks", async () => {
    const t = convexTest(schema);
    const user1 = await t.run((ctx) => ctx.db.insert("users", { name: "User 1" }));
    const user2 = await t.run((ctx) => ctx.db.insert("users", { name: "User 2" }));
    const asUser1 = t.withIdentity({ subject: user1 });
    const asUser2 = t.withIdentity({ subject: user2 });

    const nb1 = await asUser1.mutation(api.notebooks.create, { name: "User1 Book" });

    // Unauthenticated checks
    await expect(t.mutation(api.notebooks.update, { id: nb1, name: "New" })).rejects.toThrow("Not authenticated");
    await expect(t.mutation(api.notebooks.reorder, { ids: [nb1] })).rejects.toThrow("Not authenticated");
    await expect(t.mutation(api.notebooks.archive, { id: nb1, archived: true })).rejects.toThrow("Not authenticated");
    await expect(t.mutation(api.notebooks.remove, { id: nb1 })).rejects.toThrow("Not authenticated");

    // User 2 cannot access User 1 notebook
    await expect(asUser2.mutation(api.notebooks.update, { id: nb1, name: "Hacked" })).rejects.toThrow("Notebook not found");
    await expect(asUser2.mutation(api.notebooks.archive, { id: nb1, archived: true })).rejects.toThrow("Notebook not found");
    await expect(asUser2.mutation(api.notebooks.reorder, { ids: [nb1] })).rejects.toThrow("Notebook not found or access denied");
    await expect(asUser2.mutation(api.notebooks.remove, { id: nb1 })).rejects.toThrow("Notebook not found");
  });

  it("remove - cascades deletion to contacts, experiences, and transactions", async () => {
    const t = convexTest(schema);
    const userId = await t.run((ctx) => ctx.db.insert("users", { name: "User" }));
    const asUser = t.withIdentity({ subject: userId });

    const nb = await asUser.mutation(api.notebooks.create, { name: "Cascade Book" });

    const contactId = await t.run((ctx) =>
      ctx.db.insert("contacts", { userId, notebookId: nb, name: "Bob", createdAt: 1 })
    );
    const expId = await t.run((ctx) =>
      ctx.db.insert("experiences", { userId, notebookId: nb, name: "Dinner", closed: false, createdAt: 1 })
    );
    const txId = await t.run((ctx) =>
      ctx.db.insert("transactions", { userId, notebookId: nb, contactId, experienceId: expId, amount: 50, createdAt: 1 })
    );

    // Remove notebook
    await asUser.mutation(api.notebooks.remove, { id: nb });

    // Verify cascade
    await t.run(async (ctx) => {
      expect(await ctx.db.get(nb)).toBeNull();
      expect(await ctx.db.get(contactId)).toBeNull();
      expect(await ctx.db.get(expId)).toBeNull();
      expect(await ctx.db.get(txId)).toBeNull();
    });
  });
});
