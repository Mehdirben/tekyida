import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { enqueue, getAll, remove, count, clear, resetDB, removeWhere, purgeOfflineItem, purgePendingUpdates } from "./offlineQueue";

describe("offlineQueue", () => {
  beforeEach(async () => {
    resetDB();
    await clear();
  });

  afterEach(() => {
    resetDB();
  });

  it("enqueues, counts, retrieves, and clears mutations", async () => {
    expect(await count()).toBe(0);
    expect(await getAll()).toEqual([]);

    await enqueue({
      functionPath: "notebooks:create",
      args: { name: "Test Book" },
      queuedAt: Date.now(),
      tempId: "temp-1",
    });

    await enqueue({
      functionPath: "contacts:create",
      args: { name: "Alice" },
      queuedAt: Date.now(),
    });

    expect(await count()).toBe(2);
    const all = await getAll();
    expect(all).toHaveLength(2);
    expect(all[0].functionPath).toBe("notebooks:create");
    expect(all[0].tempId).toBe("temp-1");

    // Remove first item
    await remove(all[0].id!);
    expect(await count()).toBe(1);

    const remaining = await getAll();
    expect(remaining[0].functionPath).toBe("contacts:create");

    // Clear all
    await clear();
    expect(await count()).toBe(0);
  });

  it("handles open error and resets dbPromise", async () => {
    resetDB();
    const originalOpen = indexedDB.open;
    indexedDB.open = vi.fn().mockImplementation(() => {
      const req: any = {};
      setTimeout(() => {
        req.error = new Error("DB Open Failure");
        req.onerror?.();
      }, 0);
      return req;
    });

    await expect(getAll()).rejects.toThrow("DB Open Failure");
    indexedDB.open = originalOpen;
  });

  it("handles transaction errors", async () => {
    const spy = vi.spyOn(IDBDatabase.prototype, "transaction").mockImplementation(() => {
      const tx: any = {
        objectStore: () => ({ add: vi.fn(), delete: vi.fn(), clear: vi.fn(), count: vi.fn(), getAll: vi.fn() }),
      };
      setTimeout(() => {
        tx.error = new Error("Tx Failed");
        tx.onerror?.();
      }, 0);
      return tx;
    });

    await expect(enqueue({ functionPath: "test", args: {}, queuedAt: 1 })).rejects.toThrow("Tx Failed");
    await expect(remove(1)).rejects.toThrow("Tx Failed");
    await expect(clear()).rejects.toThrow("Tx Failed");
    spy.mockRestore();
  });

  it("handles upgradeneeded when store exists", async () => {
    resetDB();
    const originalOpen = indexedDB.open;
    indexedDB.open = vi.fn().mockImplementation(() => {
      const req: any = {
        result: {
          objectStoreNames: { contains: () => true },
          createObjectStore: vi.fn(),
          transaction: () => ({
            objectStore: () => ({
              count: () => {
                const r: any = {};
                setTimeout(() => { r.result = 0; r.onsuccess?.(); }, 0);
                return r;
              }
            })
          })
        },
      };
      setTimeout(() => {
        req.onupgradeneeded?.();
        req.onsuccess?.();
      }, 0);
      return req;
    });

    await count();
    indexedDB.open = originalOpen;
  });

  it("handles request errors in getAll and count", async () => {
    const getAllSpy = vi.spyOn(IDBDatabase.prototype, "transaction").mockImplementationOnce(() => {
      const req: any = {};
      const tx: any = {
        objectStore: () => ({
          getAll: () => {
            setTimeout(() => {
              req.error = new Error("Request GetAll Failed");
              req.onerror?.();
            }, 0);
            return req;
          },
        }),
      };
      return tx;
    });

    await expect(getAll()).rejects.toThrow("Request GetAll Failed");
    getAllSpy.mockRestore();

    const countSpy = vi.spyOn(IDBDatabase.prototype, "transaction").mockImplementationOnce(() => {
      const req: any = {};
      const tx: any = {
        objectStore: () => ({
          count: () => {
            setTimeout(() => {
              req.error = new Error("Request Count Failed");
              req.onerror?.();
            }, 0);
            return req;
          },
        }),
      };
      return tx;
    });

    await expect(count()).rejects.toThrow("Request Count Failed");
    countSpy.mockRestore();
  });

  it("removes mutations matching predicate with removeWhere", async () => {
    await enqueue({
      functionPath: "notebooks:create",
      args: { name: "Book 1" },
      queuedAt: 1,
      tempId: "temp-1",
    });
    await enqueue({
      functionPath: "notebooks:update",
      args: { id: "server-1", name: "Book 2" },
      queuedAt: 2,
    });
    await enqueue({
      functionPath: "notebooks:update",
      args: { id: "server-2", name: "Book 3" },
      queuedAt: 3,
    });

    expect(await count()).toBe(3);

    await removeWhere((m) => m.args?.id === "server-1");

    const remaining = await getAll();
    expect(remaining).toHaveLength(2);
    expect(remaining.map((m) => m.functionPath)).toEqual(["notebooks:create", "notebooks:update"]);
    expect(remaining[1].args?.id).toBe("server-2");
  });

  it("purges offline-created item and its cascading mutations with purgeOfflineItem", async () => {
    const tempNbId = "temp_nb_123";
    const tempContactId = "temp_c_456";

    // Notebook creation
    await enqueue({
      functionPath: "notebooks:create",
      args: { name: "Trip" },
      queuedAt: 1,
      tempId: tempNbId,
    });
    // Notebook update
    await enqueue({
      functionPath: "notebooks:update",
      args: { id: tempNbId, name: "Trip 2" },
      queuedAt: 2,
    });
    // Contact in that notebook
    await enqueue({
      functionPath: "contacts:create",
      args: { notebookId: tempNbId, name: "Bob" },
      queuedAt: 3,
      tempId: tempContactId,
    });
    // Transaction in that notebook
    await enqueue({
      functionPath: "transactions:create",
      args: { notebookId: tempNbId, contactId: tempContactId, amount: 100 },
      queuedAt: 4,
      tempId: "temp_tx_789",
    });
    // Unrelated notebook
    await enqueue({
      functionPath: "notebooks:create",
      args: { name: "Personal" },
      queuedAt: 5,
      tempId: "temp_nb_unrelated",
    });

    expect(await count()).toBe(5);

    // Purge the offline-created notebook
    await purgeOfflineItem(tempNbId, "notebooks:remove");

    const remaining = await getAll();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].tempId).toBe("temp_nb_unrelated");
  });

  it("purges pending updates for existing server item with purgePendingUpdates", async () => {
    const serverItemId = "jd789abc";

    // Pending updates for serverItemId
    await enqueue({
      functionPath: "transactions:update",
      args: { id: serverItemId, amount: 200 },
      queuedAt: 1,
    });
    await enqueue({
      functionPath: "transactions:update",
      args: { id: serverItemId, amount: 250 },
      queuedAt: 2,
    });
    // Pending update for another item
    await enqueue({
      functionPath: "transactions:update",
      args: { id: "other_id", amount: 300 },
      queuedAt: 3,
    });

    expect(await count()).toBe(3);

    await purgePendingUpdates(serverItemId);

    const remaining = await getAll();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].args.id).toBe("other_id");
  });
});

