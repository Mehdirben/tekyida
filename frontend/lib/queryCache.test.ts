import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  set,
  get,
  getInMemory,
  remove,
  clear,
  cacheKey,
  subscribe,
  preloadCache,
  openDB,
  initQueryCache,
  _resetPreloadStateForTesting,
} from "./queryCache";

describe("queryCache", () => {
  beforeEach(async () => {
    _resetPreloadStateForTesting();
    await clear();
    await preloadCache();
  });

  it("handles SSR fallback when isClient is false", () => {
    expect(() => initQueryCache(false)).not.toThrow();
  });

  it("cacheKey creates stable string representation", () => {
    const key1 = cacheKey("notebooks:list", { foo: "bar" });
    const key2 = cacheKey("notebooks:list", { foo: "bar" });
    expect(key1).toBe(key2);
    expect(key1).toBe('notebooks:list:{"foo":"bar"}');
  });

  it("stores, retrieves, notifies subscribers, and clears cache", async () => {
    const listener = vi.fn();
    const unsub = subscribe(listener);

    const key = "test:query";
    const data = [{ id: 1, name: "Item" }];

    await set(key, data);
    expect(listener).toHaveBeenCalledWith(key);

    // Sync in-memory read
    expect(getInMemory(key)).toEqual(data);

    // Async get hit from memory
    const retrieved = await get(key);
    expect(retrieved).toEqual(data);

    // Remove single entry when isPreloading is false
    await remove(key);
    expect(getInMemory(key)).toBeUndefined();
    expect(await get(key)).toBeUndefined();

    // Clear when isPreloading is false
    await clear();

    unsub();
  });

  it("retrieves from IndexedDB when not in memoryCache", async () => {
    await set("persisted:key", { val: 42 });

    // Clear memoryCache manually while keeping in IndexedDB
    _resetPreloadStateForTesting();

    // Async get should read from IDB and cache in memory
    const loaded = await get("persisted:key");
    expect(loaded).toEqual({ val: 42 });
    expect(getInMemory("persisted:key")).toEqual({ val: 42 });

    // Async get on missing key in IDB
    _resetPreloadStateForTesting();
    expect(await get("missing:key")).toBeUndefined();
  });

  it("handles openDB caching and upgradeneeded with existing store", async () => {
    const p1 = openDB();
    const p2 = openDB();
    expect(p1).toBe(p2);
    await p1;

    // Upgradeneeded when store exists
    _resetPreloadStateForTesting();
    const originalOpen = indexedDB.open;
    indexedDB.open = vi.fn().mockImplementation(() => {
      const req: any = {
        result: {
          objectStoreNames: { contains: () => true },
          createObjectStore: vi.fn(),
        },
      };
      setTimeout(() => {
        req.onupgradeneeded?.();
        req.onsuccess?.();
      }, 0);
      return req;
    });

    await openDB();
    indexedDB.open = originalOpen;
  });

  it("handles isPreloading state during set, remove, and clear", async () => {
    _resetPreloadStateForTesting();
    // In preloading state
    await set("key:mutated", "value");
    await remove("key:removed");
    await clear();

    // Verify preloadCache returns cached promise if called again
    const p1 = preloadCache();
    const p2 = preloadCache();
    expect(p1).toBe(p2);
    await p1;
  });

  it("preloads cached queries with mutated keys and aborted flags", async () => {
    // Populate IDB
    await set("pre1", "val1");
    await set("pre2", "val2");

    // Preload with mutatedKeys.has(key) == true
    _resetPreloadStateForTesting();
    await set("pre1", "val1_mutated");
    await preloadCache();
    expect(getInMemory("pre1")).toBe("val1_mutated");
    expect(getInMemory("pre2")).toBe("val2");

    // Preload with preloadAborted == true
    _resetPreloadStateForTesting();
    await clear();
    // cursor runs with preloadAborted true
    await preloadCache();
  });

  it("silently handles storage failures in set, get, remove, clear, and preloadCache", async () => {
    const spy = vi.spyOn(IDBDatabase.prototype, "transaction").mockImplementation(() => {
      throw new Error("Disk Failure");
    });

    try {
      await expect(set("f:key", "data")).resolves.toBeUndefined();
      _resetPreloadStateForTesting();
      await expect(get("f:key")).resolves.toBeUndefined();
      await expect(remove("f:key")).resolves.toBeUndefined();
      await expect(clear()).resolves.toBeUndefined();
      await expect(preloadCache()).resolves.toBeUndefined();
    } finally {
      spy.mockRestore();
    }
  });

  it("handles indexedDB.open failure in openDB", async () => {
    _resetPreloadStateForTesting();
    const originalOpen = indexedDB.open;
    indexedDB.open = vi.fn().mockImplementation(() => {
      const req: any = {};
      setTimeout(() => {
        req.error = new Error("Open DB Error");
        req.onerror?.();
      }, 0);
      return req;
    });

    await expect(preloadCache()).resolves.toBeUndefined();
    indexedDB.open = originalOpen;
  });

  it("handles cursor error and transaction rejection in preloadCache and set/remove", async () => {
    const spy = vi.spyOn(IDBDatabase.prototype, "transaction").mockImplementation(() => {
      const tx: any = {
        objectStore: () => ({
          openCursor: () => {
            const req: any = {};
            setTimeout(() => {
              req.error = new Error("Cursor error");
              req.onerror?.();
            }, 0);
            return req;
          },
          put: () => {},
          delete: () => {},
          clear: () => {},
          get: () => {
            const req: any = {};
            setTimeout(() => {
              req.error = new Error("Get error");
              req.onerror?.();
            }, 0);
            return req;
          },
        }),
      };
      setTimeout(() => {
        tx.error = new Error("Tx error");
        tx.onerror?.();
      }, 0);
      return tx;
    });

    try {
      _resetPreloadStateForTesting();
      await expect(preloadCache()).resolves.toBeUndefined();
      await expect(set("err:key", "val")).resolves.toBeUndefined();
      _resetPreloadStateForTesting();
      await expect(get("err:key")).resolves.toBeUndefined();
      await expect(remove("err:key")).resolves.toBeUndefined();
      await expect(clear()).resolves.toBeUndefined();
    } finally {
      spy.mockRestore();
    }
  });
});
