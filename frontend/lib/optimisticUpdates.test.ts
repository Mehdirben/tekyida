import { describe, it, expect, beforeEach } from "vitest";
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

    let list = (await queryCache.get<any[]>(listKey)) ?? [];
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("New Book");

    // Update
    await applyOptimisticUpdate("notebooks:update", { id: newId, name: "Renamed Book" });
    list = (await queryCache.get<any[]>(listKey)) ?? [];
    expect(list[0].name).toBe("Renamed Book");

    // Archive
    await applyOptimisticUpdate("notebooks:archive", { id: newId, archived: true });
    list = (await queryCache.get<any[]>(listKey)) ?? [];
    expect(list[0].archived).toBe(true);

    // Reorder
    await applyOptimisticUpdate("notebooks:reorder", { ids: [newId] });
    list = (await queryCache.get<any[]>(listKey)) ?? [];
    expect(list[0].order).toBe(0);

    // Remove
    await applyOptimisticUpdate("notebooks:remove", { id: newId });
    list = (await queryCache.get<any[]>(listKey)) ?? [];
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
    let contacts = (await queryCache.get<any[]>(contactKey)) ?? [];
    expect(contacts[0].name).toBe("Alice");

    // Update
    await applyOptimisticUpdate(
      "contacts:update",
      { id: contactId, name: "Alice Bob" },
      context
    );
    contacts = (await queryCache.get<any[]>(contactKey)) ?? [];
    expect(contacts[0].name).toBe("Alice Bob");

    // Remove
    await applyOptimisticUpdate("contacts:remove", { id: contactId }, context);
    contacts = (await queryCache.get<any[]>(contactKey)) ?? [];
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
    let exps = (await queryCache.get<any[]>(expKey)) ?? [];
    expect(exps[0].name).toBe("Trip");
    expect(exps[0].closed).toBe(false);

    // Close
    await applyOptimisticUpdate("experiences:close", { id: expId }, context);
    exps = (await queryCache.get<any[]>(expKey)) ?? [];
    expect(exps[0].closed).toBe(true);

    // Reopen
    await applyOptimisticUpdate("experiences:reopen", { id: expId }, context);
    exps = (await queryCache.get<any[]>(expKey)) ?? [];
    expect(exps[0].closed).toBe(false);

    // Remove
    await applyOptimisticUpdate("experiences:remove", { id: expId }, context);
    exps = (await queryCache.get<any[]>(expKey)) ?? [];
    expect(exps).toHaveLength(0);
  });

  it("returns undefined for unknown functionPath", async () => {
    const result = await applyOptimisticUpdate("unknown:mutation", {});
    expect(result).toBeUndefined();
  });
});
