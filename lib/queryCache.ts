/**
 * IndexedDB-based cache for Convex query results.
 * Stores the last-known results so they can be displayed when offline.
 */

const DB_NAME = "tekyida-cache";
const DB_VERSION = 1;
const STORE_NAME = "queries";

// ─── Change notification ────────────────────────────────────
type CacheListener = (changedKey: string) => void;
const listeners = new Set<CacheListener>();

/** Subscribe to cache changes. Returns an unsubscribe function. */
export function subscribe(listener: CacheListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function notifyListeners(key: string) {
    listeners.forEach((l) => l(key));
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
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

/** Build a stable cache key from function path + args */
export function cacheKey(functionPath: string, args: Record<string, unknown>): string {
    return `${functionPath}:${JSON.stringify(args)}`;
}

// ─── In-memory Cache ────────────────────────────────────────
const memoryCache = new Map<string, unknown>();

let preloadPromise: Promise<void> | null = null;

/**
 * Preload all cached queries from IndexedDB into memory.
 * This runs automatically on client startup so subsequent reads are completely synchronous.
 */
export function preloadCache(): Promise<void> {
    if (preloadPromise) return preloadPromise;

    preloadPromise = (async () => {
        try {
            const db = await openDB();
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, "readonly");
                const store = tx.objectStore(STORE_NAME);
                const request = store.openCursor();
                request.onsuccess = (event) => {
                    const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
                    if (cursor) {
                        memoryCache.set(cursor.key as string, cursor.value);
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
                request.onerror = () => reject(tx.error);
            });
        } catch {
            // Silently fail
        }
    })();

    return preloadPromise;
}

if (typeof window !== "undefined") {
    preloadCache();
}

/** Synchronous read from the in-memory cache */
export function getInMemory<T>(key: string): T | undefined {
    return memoryCache.get(key) as T | undefined;
}

/** Store a query result */
export async function set(key: string, data: unknown): Promise<void> {
    memoryCache.set(key, data);
    try {
        const db = await openDB();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).put(data, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        notifyListeners(key);
    } catch {
        // Silently fail — cache is best-effort
    }
}

/** Retrieve a cached query result */
export async function get<T>(key: string): Promise<T | undefined> {
    if (memoryCache.has(key)) {
        return memoryCache.get(key) as T;
    }
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const request = tx.objectStore(STORE_NAME).get(key);
            request.onsuccess = () => {
                const val = request.result as T | undefined;
                if (val !== undefined) {
                    memoryCache.set(key, val);
                }
                resolve(val);
            };
            request.onerror = () => reject(request.error);
        });
    } catch {
        return undefined;
    }
}

/** Remove a specific cache entry */
export async function remove(key: string): Promise<void> {
    memoryCache.delete(key);
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch {
        // Silently fail
    }
}

/** Clear entire query cache */
export async function clear(): Promise<void> {
    memoryCache.clear();
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch {
        // Silently fail
    }
}
