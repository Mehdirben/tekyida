import { describe, it, expect, beforeEach, vi } from "vitest";
import { applyOptimisticUpdate, tempId } from "./optimisticUpdates";
import * as queryCache from "./queryCache";

describe("optimisticUpdates", () => {
  beforeEach(async () => {
    await queryCache.clear();
  });

  it("tempId generates unique prefix string", () => {
    const id1 = tempId();
    const id2 = tempId();
    expect(id1.startsWith("temp_")).toBe(true);
    expect(id1).not.toBe(id2);
  });

  it("applies notebook optimistic updates (create, update, archive, remove, reorder)", async () => {
    const listKey = queryCache.cacheKey("notebooks.list", {});

    // Create
    const newId = await applyOptimisticUpdate("notebooks:create", { name: "New Book" });
    expect(newId).toBeDefined();

    let list = (await queryCache.get<Record<string, unknown>[]>(listKey)) ?? [];
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("New Book");

    // Update
    await applyOptimisticUpdate("notebooks:update", { id: newId, name: "Renamed Book" });
    list = (await queryCache.get<Record<string, unknown>[]>(listKey)) ?? [];
    expect(list[0].name).toBe("Renamed Book");

    // Archive
    await applyOptimisticUpdate("notebooks:archive", { id: newId, archived: true });
    list = (await queryCache.get<Record<string, unknown>[]>(listKey)) ?? [];
    expect(list[0].archived).toBe(true);

    // Reorder
    await applyOptimisticUpdate("notebooks:reorder", { ids: [newId] });
    list = (await queryCache.get<Record<string, unknown>[]>(listKey)) ?? [];
    expect(list[0].order).toBe(0);

    // Remove
    await applyOptimisticUpdate("notebooks:remove", { id: newId });
    list = (await queryCache.get<Record<string, unknown>[]>(listKey)) ?? [];
    expect(list).toHaveLength(0);
  });

  it("applies contact optimistic updates (create, update, remove)", async () => {
    const notebookId = "nb_1";
    const context = { notebookId };

    const contactId = await applyOptimisticUpdate(
      "contacts:create",
      { notebookId, name: "Alice", phone: "123" },
      context
    );
    expect(contactId).toBeDefined();

    const contactKey = queryCache.cacheKey("contacts.list", { notebookId });
    let contacts = (await queryCache.get<Record<string, unknown>[]>(contactKey)) ?? [];
    expect(contacts[0].name).toBe("Alice");

    // Update
    await applyOptimisticUpdate(
      "contacts:update",
      { id: contactId, name: "Alice Bob" },
      context
    );
    contacts = (await queryCache.get<Record<string, unknown>[]>(contactKey)) ?? [];
    expect(contacts[0].name).toBe("Alice Bob");

    // Remove
    await applyOptimisticUpdate("contacts:remove", { id: contactId }, context);
    contacts = (await queryCache.get<Record<string, unknown>[]>(contactKey)) ?? [];
    expect(contacts).toHaveLength(0);
  });

  it("applies experience optimistic updates (create, close, reopen, remove)", async () => {
    const notebookId = "nb_1";
    const context = { notebookId };

    const expId = await applyOptimisticUpdate(
      "experiences:create",
      { notebookId, name: "Trip" },
      context
    );
    expect(expId).toBeDefined();

    const expKey = queryCache.cacheKey("experiences.list", { notebookId });
    let exps = (await queryCache.get<Record<string, unknown>[]>(expKey)) ?? [];
    expect(exps[0].name).toBe("Trip");
    expect(exps[0].closed).toBe(false);

    // Close
    await applyOptimisticUpdate("experiences:close", { id: expId }, context);
    exps = (await queryCache.get<Record<string, unknown>[]>(expKey)) ?? [];
    expect(exps[0].closed).toBe(true);

    // Reopen
    await applyOptimisticUpdate("experiences:reopen", { id: expId }, context);
    exps = (await queryCache.get<Record<string, unknown>[]>(expKey)) ?? [];
    expect(exps[0].closed).toBe(false);

    // Remove
    await applyOptimisticUpdate("experiences:remove", { id: expId }, context);
    exps = (await queryCache.get<Record<string, unknown>[]>(expKey)) ?? [];
    expect(exps).toHaveLength(0);
  });

  it("applies transaction optimistic updates for contacts (create, update, remove)", async () => {
    const notebookId = "nb_1";
    const contactId = "c_1";
    const context = { notebookId, contactId };

    // Seed contact in cache
    await queryCache.set(queryCache.cacheKey("contacts.list", { notebookId }), [
      { _id: contactId, name: "Alice", balance: 0, transactionCount: 0 },
    ]);
    await queryCache.set(queryCache.cacheKey("notebooks.list", {}), [
      { _id: notebookId, name: "Book", balance: 0, contactCount: 1 },
    ]);

    const txId = await applyOptimisticUpdate(
      "transactions:create",
      { notebookId, contactId, amount: 100, description: "Loan", date: 1000 },
      context
    );
    expect(txId).toBeDefined();

    const txKey = queryCache.cacheKey("transactions.list", { contactId });
    let txs = (await queryCache.get<Record<string, unknown>[]>(txKey)) ?? [];
    expect(txs).toHaveLength(1);
    expect(txs[0].amount).toBe(100);

    let contacts = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("contacts.list", { notebookId }))) ?? [];
    expect(contacts[0].balance).toBe(100);
    expect(contacts[0].transactionCount).toBe(1);

    const notebooks = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("notebooks.list", {}))) ?? [];
    expect(notebooks[0].balance).toBe(100);

    // Update: amount changes 100 → 60
    await applyOptimisticUpdate(
      "transactions:update",
      { id: txId, amount: 60, description: "Loan updated", date: 2000 },
      context
    );
    txs = (await queryCache.get<Record<string, unknown>[]>(txKey)) ?? [];
    expect(txs[0].amount).toBe(60);
    expect(txs[0].description).toBe("Loan updated");

    contacts = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("contacts.list", { notebookId }))) ?? [];
    expect(contacts[0].balance).toBe(60);

    // Remove
    await applyOptimisticUpdate("transactions:remove", { id: txId }, context);
    txs = (await queryCache.get<Record<string, unknown>[]>(txKey)) ?? [];
    expect(txs).toHaveLength(0);

    contacts = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("contacts.list", { notebookId }))) ?? [];
    expect(contacts[0].balance).toBe(0);
    expect(contacts[0].transactionCount).toBe(0);
  });

  it("applies transaction optimistic updates for experiences (create, update, remove)", async () => {
    const notebookId = "nb_1";
    const experienceId = "e_1";
    const context = { notebookId, experienceId };

    await queryCache.set(queryCache.cacheKey("experiences.list", { notebookId }), [
      { _id: experienceId, name: "Trip", balance: 0, transactionCount: 0 },
    ]);
    await queryCache.set(queryCache.cacheKey("notebooks.list", {}), [
      { _id: notebookId, name: "Book", balance: 0 },
    ]);

    const txId = await applyOptimisticUpdate(
      "transactions:create",
      { notebookId, experienceId, amount: 200, date: 5000 },
      context
    );
    expect(txId).toBeDefined();

    const txKey = queryCache.cacheKey("transactions.list", { experienceId });
    let txs = (await queryCache.get<Record<string, unknown>[]>(txKey)) ?? [];
    expect(txs).toHaveLength(1);

    let exps = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("experiences.list", { notebookId }))) ?? [];
    expect(exps[0].balance).toBe(200);
    expect(exps[0].transactionCount).toBe(1);
    expect(exps[0].lastTransactionDate).toBe(5000);

    await applyOptimisticUpdate(
      "transactions:update",
      { id: txId, amount: 150, date: 6000 },
      context
    );
    exps = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("experiences.list", { notebookId }))) ?? [];
    expect(exps[0].balance).toBe(150);

    const notebooks = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("notebooks.list", {}))) ?? [];
    expect(notebooks[0].balance).toBe(150);

    await applyOptimisticUpdate("transactions:remove", { id: txId }, context);
    txs = (await queryCache.get<Record<string, unknown>[]>(txKey)) ?? [];
    expect(txs).toHaveLength(0);

    exps = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("experiences.list", { notebookId }))) ?? [];
    expect(exps[0].balance).toBe(0);
    expect(exps[0].transactionCount).toBe(0);
  });

  it("skips transaction updates and removes when no transaction cache key is available", async () => {
    const result1 = await applyOptimisticUpdate("transactions:update", { id: "t_1", amount: 5 });
    expect(result1).toBeUndefined();
    const result2 = await applyOptimisticUpdate("transactions:remove", { id: "t_1" });
    expect(result2).toBeUndefined();
  });

  it("transfers an experience between notebooks and adjusts both balances", async () => {
    const sourceNotebookId = "nb_src";
    const targetNotebookId = "nb_tgt";
    const experienceId = "e_1";

    await queryCache.set(queryCache.cacheKey("experiences.list", { notebookId: sourceNotebookId }), [
      { _id: experienceId, name: "Trip", balance: 300, notebookId: sourceNotebookId, contactId: "c_1" },
    ]);
    await queryCache.set(queryCache.cacheKey("experiences.list", { notebookId: targetNotebookId }), []);
    await queryCache.set(queryCache.cacheKey("notebooks.list", {}), [
      { _id: sourceNotebookId, name: "Source", balance: 300 },
      { _id: targetNotebookId, name: "Target", balance: 0 },
    ]);

    await applyOptimisticUpdate(
      "experiences:transfer",
      { id: experienceId, targetNotebookId },
      { notebookId: sourceNotebookId }
    );

    const sourceList = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("experiences.list", { notebookId: sourceNotebookId }))) ?? [];
    expect(sourceList).toHaveLength(0);

    const targetList = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("experiences.list", { notebookId: targetNotebookId }))) ?? [];
    expect(targetList).toHaveLength(1);
    expect(targetList[0].notebookId).toBe(targetNotebookId);
    expect(targetList[0].contactId).toBeUndefined();

    const notebooks = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("notebooks.list", {}))) ?? [];
    expect(notebooks[0].balance).toBe(0);
    expect(notebooks[1].balance).toBe(300);
  });

  it("does nothing when transferring without a source notebook", async () => {
    const result = await applyOptimisticUpdate(
      "experiences:transfer",
      { id: "e_1", targetNotebookId: "nb_tgt" }
    );
    expect(result).toBeUndefined();
  });

  it("returns undefined for unknown functionPath", async () => {
    const result = await applyOptimisticUpdate("unknown:mutation", {});
    expect(result).toBeUndefined();
  });
});

describe("optimisticUpdates - edge cases", () => {
  beforeEach(async () => {
    await queryCache.clear();
  });

  it("skips contact updates without a notebook context", async () => {
    expect(await applyOptimisticUpdate("contacts:update", { id: "c1", name: "X" })).toBeUndefined();
    expect(await applyOptimisticUpdate("contacts:remove", { id: "c1" })).toBeUndefined();
  });

  it("skips experience updates without a notebook context", async () => {
    expect(await applyOptimisticUpdate("experiences:update", { id: "e1", name: "X" })).toBeUndefined();
  });

  it("updates experiences in the cache", async () => {
    const notebookId = "nb_1";
    const context = { notebookId };
    await queryCache.set(queryCache.cacheKey("experiences.list", { notebookId }), [
      { _id: "e1", name: "Trip", contactId: "c1" },
    ]);

    await applyOptimisticUpdate(
      "experiences:update",
      { id: "e1", name: "Trip renamed", contactId: "c2" },
      context
    );

    const exps = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("experiences.list", { notebookId }))) ?? [];
    expect(exps[0].name).toBe("Trip renamed");
    expect(exps[0].contactId).toBe("c2");
  });

  it("ignores transaction updates for missing transactions", async () => {
    const context = { notebookId: "nb_1", contactId: "c_missing" };
    await applyOptimisticUpdate("transactions:update", { id: "nope", amount: 10 }, context);
    const notebooks = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("notebooks.list", {}))) ?? [];
    expect(notebooks).toHaveLength(0);
  });

  it("ignores transaction removals for missing transactions", async () => {
    const context = { notebookId: "nb_1", contactId: "c_missing" };
    await applyOptimisticUpdate("transactions:remove", { id: "nope" }, context);
    const notebooks = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("notebooks.list", {}))) ?? [];
    expect(notebooks).toHaveLength(0);
  });

  it("adds and removes closed-experience summaries on the linked contact", async () => {
    const notebookId = "nb_1";
    const context = { notebookId };
    const expId = "e_1";

    await queryCache.set(queryCache.cacheKey("contacts.list", { notebookId }), [
      { _id: "c_1", name: "Alice", balance: 0, experiences: [] },
    ]);
    await queryCache.set(queryCache.cacheKey("experiences.list", { notebookId }), [
      { _id: expId, name: "Trip", closed: false, balance: 120, transactionCount: 3, contactId: "c_1", lastTransactionDate: 500 },
    ]);

    await applyOptimisticUpdate("experiences:close", { id: expId }, context);

    let contacts = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("contacts.list", { notebookId }))) ?? [];
    let exps = contacts[0].experiences as Record<string, unknown>[];
    expect(exps).toHaveLength(1);
    expect(exps[0].name).toBe("Trip");
    expect(contacts[0].balance).toBe(120);

    await applyOptimisticUpdate("experiences:reopen", { id: expId }, context);

    contacts = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("contacts.list", { notebookId }))) ?? [];
    exps = contacts[0].experiences as Record<string, unknown>[];
    expect(exps).toHaveLength(0);
    expect(contacts[0].balance).toBe(0);
  });

  it("handles reopening an experience that has no cached summary on the contact", async () => {
    const notebookId = "nb_1";
    const context = { notebookId };
    const expId = "e_1";

    await queryCache.set(queryCache.cacheKey("contacts.list", { notebookId }), [
      { _id: "c_1", name: "Alice", balance: 50, experiences: [] },
    ]);
    await queryCache.set(queryCache.cacheKey("experiences.list", { notebookId }), [
      { _id: expId, name: "Trip", closed: true, balance: 80, transactionCount: 1, contactId: "c_1" },
    ]);

    await applyOptimisticUpdate("experiences:reopen", { id: expId }, context);

    const contacts = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("contacts.list", { notebookId }))) ?? [];
    expect(contacts[0].balance).toBe(-30);
  });

  it("keeps the latest transaction date on experiences", async () => {
    const notebookId = "nb_1";
    const experienceId = "e_1";
    const context = { notebookId, experienceId };

    await queryCache.set(queryCache.cacheKey("experiences.list", { notebookId }), [
      { _id: experienceId, name: "Trip", balance: 0, transactionCount: 0, lastTransactionDate: 900 },
    ]);

    await applyOptimisticUpdate(
      "transactions:create",
      { notebookId, experienceId, amount: 10, date: 100 },
      context
    );

    const exps = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("experiences.list", { notebookId }))) ?? [];
    expect(exps[0].lastTransactionDate).toBe(900);
  });

  it("ignores transfers of missing experiences", async () => {
    const result = await applyOptimisticUpdate(
      "experiences:transfer",
      { id: "e_missing", targetNotebookId: "nb_tgt" },
      { notebookId: "nb_src" }
    );
    expect(result).toBeUndefined();
  });

  it("swallows cache failures and returns undefined", async () => {
    const getSpy = vi.spyOn(queryCache, "get").mockRejectedValue(new Error("cache offline"));
    const result = await applyOptimisticUpdate("notebooks:create", { name: "X" });
    expect(result).toBeUndefined();
    getSpy.mockRestore();
  });
});

describe("optimisticUpdates - reorder sorting", () => {
  beforeEach(async () => {
    await queryCache.clear();
  });

  it("sorts cached notebooks to match the reordered ids, keeping unknown ids last", async () => {
    const key = queryCache.cacheKey("notebooks.list", {});
    await queryCache.set(key, [
      { _id: "a", name: "A", order: 0 },
      { _id: "b", name: "B", order: 1 },
      { _id: "c", name: "C", order: 2 },
    ]);

    await applyOptimisticUpdate("notebooks:reorder", { ids: ["c", "ghost", "a", "b"] });

    const list = (await queryCache.get<Record<string, unknown>[]>(key)) ?? [];
    expect(list.map((n) => n._id)).toEqual(["c", "a", "b"]);
    expect(list[0].order).toBe(0);
    expect(list[1].order).toBe(2);
    expect(list[2].order).toBe(3);
  });
});

describe("optimisticUpdates - missing documents", () => {
  beforeEach(async () => {
    await queryCache.clear();
  });

  it("ignores contact removals when the contact is not cached", async () => {
    const result = await applyOptimisticUpdate(
      "contacts:remove",
      { id: "c_missing" },
      { notebookId: "nb_1" }
    );
    expect(result).toBeUndefined();
  });

  it("increments the notebook contact count when a contact is created", async () => {
    await queryCache.set(queryCache.cacheKey("notebooks.list", {}), [
      { _id: "nb_1", name: "Book", contactCount: 0, balance: 0 },
    ]);

    await applyOptimisticUpdate(
      "contacts:create",
      { notebookId: "nb_1", name: "Alice" },
      { notebookId: "nb_1" }
    );

    const notebooks = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("notebooks.list", {}))) ?? [];
    expect(notebooks[0].contactCount).toBe(1);
  });
});

describe("optimisticUpdates - full cache flows", () => {
  beforeEach(async () => {
    await queryCache.clear();
  });

  it("decrements the notebook contact count and balance when a contact is removed", async () => {
    await queryCache.set(queryCache.cacheKey("notebooks.list", {}), [
      { _id: "nb_1", name: "Book", contactCount: 1, balance: 40 },
    ]);
    await queryCache.set(queryCache.cacheKey("contacts.list", { notebookId: "nb_1" }), [
      { _id: "c_1", name: "Alice", balance: 40 },
    ]);

    await applyOptimisticUpdate("contacts:remove", { id: "c_1" }, { notebookId: "nb_1" });

    const notebooks = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("notebooks.list", {}))) ?? [];
    expect(notebooks[0].contactCount).toBe(0);
    expect(notebooks[0].balance).toBe(0);
  });

  it("skips experience removals, closes and reopens without a notebook context", async () => {
    expect(await applyOptimisticUpdate("experiences:remove", { id: "e1" })).toBeUndefined();
    expect(await applyOptimisticUpdate("experiences:close", { id: "e1" })).toBeUndefined();
    expect(await applyOptimisticUpdate("experiences:reopen", { id: "e1" })).toBeUndefined();
  });

  it("ignores close/reopen for missing experiences", async () => {
    const context = { notebookId: "nb_1" };
    await queryCache.set(queryCache.cacheKey("experiences.list", context), []);

    await applyOptimisticUpdate("experiences:close", { id: "nope" }, context);
    await applyOptimisticUpdate("experiences:reopen", { id: "nope" }, context);

    const exps = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("experiences.list", context))) ?? [];
    expect(exps).toHaveLength(0);
  });

  it("reorders with unknown ids sorted last by the comparator", async () => {
    const key = queryCache.cacheKey("notebooks.list", {});
    await queryCache.set(key, [
      { _id: "zzz", name: "Not in ids" },
      { _id: "a", name: "A" },
      { _id: "b", name: "B" },
    ]);

    await applyOptimisticUpdate("notebooks:reorder", { ids: ["b", "a"] });

    const list = (await queryCache.get<Record<string, unknown>[]>(key)) ?? [];
    expect(list.map((n) => n._id)).toEqual(["b", "a", "zzz"]);
    expect(list[2].order).toBeUndefined();
  });
});

describe("optimisticUpdates - experience contact edge cases", () => {
  beforeEach(async () => {
    await queryCache.clear();
  });

  it("stops after patching the experience when the linked contact is not cached", async () => {
    const context = { notebookId: "nb_1" };
    await queryCache.set(queryCache.cacheKey("experiences.list", context), [
      { _id: "e_1", name: "Trip", closed: false, balance: 100, contactId: "c_missing" },
    ]);

    await applyOptimisticUpdate("experiences:close", { id: "e_1" }, context);

    const contacts = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("contacts.list", context))) ?? [];
    expect(contacts).toHaveLength(0);
  });
});

describe("optimisticUpdates - sparse cached documents", () => {
  beforeEach(async () => {
    await queryCache.clear();
  });

  it("defaults missing numeric fields when patching notebooks and contacts", async () => {
    await queryCache.set(queryCache.cacheKey("notebooks.list", {}), [
      { _id: "nb_1", name: "Book" },
    ]);
    await queryCache.set(queryCache.cacheKey("contacts.list", { notebookId: "nb_1" }), [
      { _id: "c_1", name: "Alice" },
    ]);

    await applyOptimisticUpdate(
      "contacts:create",
      { notebookId: "nb_1", name: "Bob" },
      { notebookId: "nb_1" }
    );
    await applyOptimisticUpdate(
      "transactions:create",
      { notebookId: "nb_1", contactId: "c_1", amount: 25 },
      { notebookId: "nb_1", contactId: "c_1" }
    );

    const notebooks = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("notebooks.list", {}))) ?? [];
    expect(notebooks[0].balance).toBe(25);
    const contacts = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("contacts.list", { notebookId: "nb_1" }))) ?? [];
    expect(contacts.find((c) => c._id === "c_1")?.balance).toBe(25);
  });

  it("defaults missing numeric fields when removing contacts and transactions", async () => {
    await queryCache.set(queryCache.cacheKey("notebooks.list", {}), [
      { _id: "nb_1", name: "Book" },
    ]);
    await queryCache.set(queryCache.cacheKey("contacts.list", { notebookId: "nb_1" }), [
      { _id: "c_1", name: "Alice" },
    ]);
    await queryCache.set(queryCache.cacheKey("transactions.list", { contactId: "c_1" }), [
      { _id: "t_1", amount: 30 },
    ]);

    await applyOptimisticUpdate("transactions:remove", { id: "t_1" }, { notebookId: "nb_1", contactId: "c_1" });
    await applyOptimisticUpdate("contacts:remove", { id: "c_1" }, { notebookId: "nb_1" });

    const notebooks = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("notebooks.list", {}))) ?? [];
    expect(notebooks[0].contactCount).toBe(0);
    expect(notebooks[0].balance).toBe(0);
  });

  it("defaults missing summary fields when closing experiences", async () => {
    await queryCache.set(queryCache.cacheKey("contacts.list", { notebookId: "nb_1" }), [
      { _id: "c_1", name: "Alice" },
    ]);
    await queryCache.set(queryCache.cacheKey("experiences.list", { notebookId: "nb_1" }), [
      { _id: "e_1", name: "Trip", closed: false, contactId: "c_1" },
    ]);

    await applyOptimisticUpdate("experiences:close", { id: "e_1" }, { notebookId: "nb_1" });

    const contacts = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("contacts.list", { notebookId: "nb_1" }))) ?? [];
    expect(contacts[0].balance).toBe(0);
  });

  it("defaults missing balance fields when reopening experiences", async () => {
    await queryCache.set(queryCache.cacheKey("contacts.list", { notebookId: "nb_1" }), [
      { _id: "c_1", name: "Alice" },
    ]);
    await queryCache.set(queryCache.cacheKey("experiences.list", { notebookId: "nb_1" }), [
      { _id: "e_1", name: "Trip", closed: true, contactId: "c_1" },
    ]);

    await applyOptimisticUpdate("experiences:reopen", { id: "e_1" }, { notebookId: "nb_1" });

    const contacts = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("contacts.list", { notebookId: "nb_1" }))) ?? [];
    expect(contacts[0].balance).toBe(0);
  });

  it("defaults missing balance when transferring experiences", async () => {
    await queryCache.set(queryCache.cacheKey("experiences.list", { notebookId: "nb_src" }), [
      { _id: "e_1", name: "Trip" },
    ]);
    await queryCache.set(queryCache.cacheKey("experiences.list", { notebookId: "nb_tgt" }), []);
    await queryCache.set(queryCache.cacheKey("notebooks.list", {}), [
      { _id: "nb_src", name: "Source" },
      { _id: "nb_tgt", name: "Target" },
    ]);

    await applyOptimisticUpdate(
      "experiences:transfer",
      { id: "e_1", targetNotebookId: "nb_tgt" },
      { notebookId: "nb_src" }
    );

    const targetList = (await queryCache.get<Record<string, unknown>[]>(queryCache.cacheKey("experiences.list", { notebookId: "nb_tgt" }))) ?? [];
    expect(targetList).toHaveLength(1);
  });

  it("treats cached notebooks missing from the reorder list as last", async () => {
    const key = queryCache.cacheKey("notebooks.list", {});
    await queryCache.set(key, [
      { _id: "a", name: "A" },
      { _id: "b", name: "B" },
      { _id: "zzz", name: "Not in list" },
    ]);

    await applyOptimisticUpdate("notebooks:reorder", { ids: ["b", "a"] });

    const list = (await queryCache.get<Record<string, unknown>[]>(key)) ?? [];
    expect(list.map((n) => n._id)).toEqual(["b", "a", "zzz"]);
  });
});
