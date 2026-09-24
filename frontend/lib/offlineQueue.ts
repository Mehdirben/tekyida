/**
 * IndexedDB-based offline mutation queue.
 * Stores Convex mutations that failed while offline and replays them when back online.
 */

const DB_NAME = "tekyida-offline";
const DB_VERSION = 1;
const STORE_NAME = "mutations";

export interface QueuedMutation {
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

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, {
                    keyPath: "id",
                    autoIncrement: true,
                });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            dbPromise = null; // Allow retry on failure
            reject(request.error);
        };
    });

    return dbPromise;
}

export function resetDB(): void {
    dbPromise = null;
}

/** Add a mutation to the offline queue */
export async function enqueue(mutation: Omit<QueuedMutation, "id">): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).add(mutation);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/** Get all queued mutations in insertion order */
export async function getAll(): Promise<QueuedMutation[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/** Remove a specific mutation by id */
export async function remove(id: number): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/** Get the count of pending mutations */
export async function count(): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const request = tx.objectStore(STORE_NAME).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/** Clear all queued mutations */
export async function clear(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
