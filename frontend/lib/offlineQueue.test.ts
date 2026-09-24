import { describe, it, expect, beforeEach } from "vitest";
import { enqueue, getAll, remove, count, clear } from "./offlineQueue";

describe("offlineQueue", () => {
  beforeEach(async () => {
    await clear();
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
});
