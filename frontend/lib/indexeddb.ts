/**
 * Shared IndexedDB plumbing: memoized DB opening and promise-wrapped transactions.
 */

const dbPromises = new Map<string, Promise<IDBDatabase>>();

export function openStore(
    dbName: string,
    version: number,
    storeName: string,
    createStoreOptions?: IDBObjectStoreParameters
): Promise<IDBDatabase> {
    const cached = dbPromises.get(dbName);
    if (cached) return cached;

    const promise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, version);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, createStoreOptions);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            dbPromises.delete(dbName); // Allow retry on failure
            reject(request.error);
        };
    });

    dbPromises.set(dbName, promise);
    return promise;
}

/** Forget the memoized connection so the next openStore call reopens the DB. */
export function resetStore(dbName: string): void {
    dbPromises.delete(dbName);
}

/**
 * Run an operation inside a transaction and resolve when it completes.
 * If `run` returns a request, the promise resolves with its result;
 * otherwise it resolves via transaction completion.
 */
export function txAsPromise<T>(
    db: IDBDatabase,
    storeName: string,
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T> {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = run(store);
        if (request) {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        }
        tx.oncomplete = () => resolve(undefined as T);
        tx.onerror = () => reject(tx.error);
    });
}
