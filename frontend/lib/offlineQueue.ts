/**
 * IndexedDB-based offline mutation queue.
 * Stores Convex mutations that failed while offline and replays them when back online.
 */

import { openStore, resetStore, txAsPromise } from "./indexeddb";

const DB_NAME = "tekyida-offline";
const DB_VERSION = 1;
const STORE_NAME = "mutations";

interface QueuedMutation {
    id?: number;
    /** Convex function path, e.g. "notebooks:create" */
    functionPath: string;
    /** Arguments to the mutation */
    args: Record<string, unknown>;
    /** Timestamp when queued */
    queuedAt: number;
    /** Temp ID assigned locally for create mutations (used for ID mapping during sync) */
    tempId?: string;
}

function openDB(): Promise<IDBDatabase> {
    return openStore(DB_NAME, DB_VERSION, STORE_NAME, {
        keyPath: "id",
        autoIncrement: true,
    });
}

export function resetDB(): void {
    resetStore(DB_NAME);
}

/** Add a mutation to the offline queue */
export async function enqueue(mutation: Omit<QueuedMutation, "id">): Promise<void> {
    const db = await openDB();
    return txAsPromise(db, STORE_NAME, "readwrite", (store) => {
        store.add(mutation);
    });
}

/** Get all queued mutations in insertion order */
export async function getAll(): Promise<QueuedMutation[]> {
    const db = await openDB();
    return txAsPromise(db, STORE_NAME, "readonly", (store) => store.getAll());
}

/** Remove a specific mutation by id */
export async function remove(id: number): Promise<void> {
    const db = await openDB();
    return txAsPromise(db, STORE_NAME, "readwrite", (store) => {
        store.delete(id);
    });
}

/** Get the count of pending mutations */
export async function count(): Promise<number> {
    const db = await openDB();
    return txAsPromise(db, STORE_NAME, "readonly", (store) => store.count());
}

/** Clear all queued mutations */
export async function clear(): Promise<void> {
    const db = await openDB();
    return txAsPromise(db, STORE_NAME, "readwrite", (store) => {
        store.clear();
    });
}

/** Remove mutations matching a predicate */
export async function removeWhere(predicate: (mutation: QueuedMutation) => boolean): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.openCursor();
        request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
                const item = cursor.value as QueuedMutation;
                if (predicate(item)) {
                    cursor.delete();
                }
                cursor.continue();
            }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/** Purge mutations related to a deleted offline-created item */
export async function purgeOfflineItem(
    targetId: string,
    functionPath: string
): Promise<void> {
    await removeWhere((queued) => {
        // Matches the creation mutation of this item
        if (queued.tempId === targetId) return true;
        // Matches direct operations on this item (update, etc.)
        if (queued.args?.id === targetId) return true;
        // Cascade matching based on the item type being removed
        if (functionPath === "notebooks:remove" && queued.args?.notebookId === targetId) {
            return true;
        }
        if (functionPath === "experiences:remove" && queued.args?.experienceId === targetId) {
            return true;
        }
        if (functionPath === "contacts:remove" && queued.args?.contactId === targetId) {
            return true;
        }
        return false;
    });
}

/** Purge pending update mutations for an existing item */
export async function purgePendingUpdates(targetId: string): Promise<void> {
    await removeWhere((queued) => {
        return queued.functionPath.endsWith(":update") && queued.args?.id === targetId;
    });
}
