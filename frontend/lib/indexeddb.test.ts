import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { openStore, resetStore, txAsPromise } from "./indexeddb";

let dbCounter = 0;

describe("openStore", () => {
    beforeEach(() => {
        dbCounter += 1;
    });

    it("memoizes the connection per database name", async () => {
        const name = `idb-db-${dbCounter}`;
        const p1 = openStore(name, 1, "store");
        const p2 = openStore(name, 1, "store");
        expect(p1).toBe(p2);
        await p1;
        resetStore(name);
    });

    it("opens separate connections for separate database names", async () => {
        const nameA = `idb-db-${dbCounter}-a`;
        const nameB = `idb-db-${dbCounter}-b`;
        const p1 = openStore(nameA, 1, "store");
        const p2 = openStore(nameB, 1, "store");
        expect(p1).not.toBe(p2);
        await Promise.all([p1, p2]);
        resetStore(nameA);
        resetStore(nameB);
    });

    it("creates the store on upgrade with the provided options", async () => {
        const name = `idb-db-${dbCounter}`;
        const db = await openStore(name, 1, "store", {
            keyPath: "id",
            autoIncrement: true,
        });
        expect(db.objectStoreNames.contains("store")).toBe(true);

        const generatedKey = await txAsPromise<IDBValidKey>(
            db,
            "store",
            "readwrite",
            (store) => store.add({ name: "a" }) as IDBRequest<IDBValidKey>
        );
        expect(generatedKey).toBe(1);
        resetStore(name);
    });

    it("clears the memo on failure so the next call retries", async () => {
        const name = `idb-db-${dbCounter}`;

        const originalOpen = indexedDB.open;
        indexedDB.open = vi.fn().mockImplementation(() => {
            const req = {
                error: new Error("Open Failed"),
            };
            setTimeout(() => {
                (req as { onerror?: () => void }).onerror?.();
            }, 0);
            return req as unknown as IDBOpenDBRequest;
        });

        await expect(openStore(name, 1, "store")).rejects.toThrow("Open Failed");
        indexedDB.open = originalOpen;

        const db = await openStore(name, 1, "store");
        expect(db).toBeInstanceOf(IDBDatabase);
        resetStore(name);
    });

    it("reuses a new promise after resetStore", async () => {
        const name = `idb-db-${dbCounter}`;
        const p1 = await openStore(name, 1, "store");
        resetStore(name);
        const p2 = await openStore(name, 1, "store");
        expect(p1).toBeInstanceOf(IDBDatabase);
        expect(p2).toBeInstanceOf(IDBDatabase);
        resetStore(name);
    });
});

describe("txAsPromise", () => {
    let db: IDBDatabase;
    let dbName: string;

    beforeEach(async () => {
        dbCounter += 1;
        dbName = `idb-ops-db-${dbCounter}`;
        db = await openStore(dbName, 1, "store");
    });

    afterEach(() => {
        resetStore(dbName);
    });

    it("resolves with the request result when run returns a request", async () => {
        await txAsPromise(db, "store", "readwrite", (store) => {
            store.put({ v: 1 }, "k1");
        });
        const result = await txAsPromise<{ v: number }>(
            db,
            "store",
            "readonly",
            (store) => store.get("k1")
        );
        expect(result).toEqual({ v: 1 });
    });

    it("resolves via transaction completion when run returns no request", async () => {
        const result = await txAsPromise(db, "store", "readwrite", (store) => {
            store.put({ v: 2 }, "k2");
        });
        expect(result).toBeUndefined();
        const read = await txAsPromise<{ v: number }>(
            db,
            "store",
            "readonly",
            (store) => store.get("k2")
        );
        expect(read).toEqual({ v: 2 });
    });

    it("rejects when the request errors", async () => {
        const tx = {
            objectStore: () => ({
                get: () => {
                    const req: {
                        error?: Error;
                        onerror?: () => void;
                    } = {};
                    setTimeout(() => {
                        req.error = new Error("Request Boom");
                        req.onerror?.();
                    }, 0);
                    return req;
                },
            }),
        };
        const spy = vi
            .spyOn(IDBDatabase.prototype, "transaction")
            .mockImplementation(() => tx as unknown as IDBTransaction);

        try {
            await expect(
                txAsPromise(db, "store", "readonly", (store) => store.get("x"))
            ).rejects.toThrow("Request Boom");
        } finally {
            spy.mockRestore();
        }
    });

    it("rejects when the transaction errors", async () => {
        const tx = {
            error: null as Error | null,
            onerror: null as (() => void) | null,
            objectStore: () => ({
                getAll: () => {
                    const req: {
                        error?: Error;
                        onerror?: () => void;
                    } = {};
                    setTimeout(() => {
                        tx.error = new Error("Tx Boom");
                        tx.onerror?.();
                    }, 0);
                    return req;
                },
            }),
        };
        const spy = vi
            .spyOn(IDBDatabase.prototype, "transaction")
            .mockImplementation(() => tx as unknown as IDBTransaction);

        try {
            await expect(
                txAsPromise(db, "store", "readonly", (store) => store.getAll())
            ).rejects.toThrow("Tx Boom");
        } finally {
            spy.mockRestore();
        }
    });
});
