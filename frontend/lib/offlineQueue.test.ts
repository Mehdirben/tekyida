import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { enqueue, getAll, remove, count, clear, resetDB } from "./offlineQueue";

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
});
