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
} from "./queryCache";

describe("queryCache", () => {
  beforeEach(async () => {
    await clear();
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

    // Async get hit
    const retrieved = await get(key);
    expect(retrieved).toEqual(data);

    // Async get miss
    expect(await get("non_existent")).toBeUndefined();

    // Remove single entry
    await remove(key);
    expect(getInMemory(key)).toBeUndefined();
    expect(await get(key)).toBeUndefined();

    unsub();
  });

  it("preloadCache loads entries from IDB into memory", async () => {
    await set("key1", "val1");
    await preloadCache();
    expect(getInMemory("key1")).toBe("val1");
  });
});
