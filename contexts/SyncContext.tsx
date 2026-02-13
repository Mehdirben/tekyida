"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useRef,
    type ReactNode,
} from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as offlineQueue from "@/lib/offlineQueue";
import { applyOptimisticUpdate, type OptimisticContext } from "@/lib/optimisticUpdates";

export type SyncStatus = "synced" | "pending" | "syncing" | "offline";

interface SyncContextValue {
    /** Current sync status */
    status: SyncStatus;
    /** Number of mutations waiting to sync */
    pendingCount: number;
    /** Whether the browser is online */
    isOnline: boolean;
    /** Wraps a Convex mutation call — queues it if offline */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    offlineMutation: (functionPath: string, mutationFn: (args: any) => Promise<any>, args: Record<string, unknown>, optimisticCtx?: OptimisticContext) => Promise<any>;
    /** Force flush the queue now */
    flushQueue: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

// Map of Convex API function paths to their mutation references
const MUTATION_MAP: Record<string, readonly [string, string]> = {
    "notebooks:create": ["notebooks", "create"],
    "notebooks:update": ["notebooks", "update"],
    "notebooks:remove": ["notebooks", "remove"],
    "contacts:create": ["contacts", "create"],
    "contacts:update": ["contacts", "update"],
    "contacts:remove": ["contacts", "remove"],
    "transactions:create": ["transactions", "create"],
    "transactions:update": ["transactions", "update"],
    "transactions:remove": ["transactions", "remove"],
};

export function SyncProvider({ children }: { children: ReactNode }) {
    const [isOnline, setIsOnline] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const flushingRef = useRef(false);

    // Get all mutation functions
    const notebooksCreate = useMutation(api.notebooks.create);
    const notebooksUpdate = useMutation(api.notebooks.update);
    const notebooksRemove = useMutation(api.notebooks.remove);
    const contactsCreate = useMutation(api.contacts.create);
    const contactsUpdate = useMutation(api.contacts.update);
    const contactsRemove = useMutation(api.contacts.remove);
    const transactionsCreate = useMutation(api.transactions.create);
    const transactionsUpdate = useMutation(api.transactions.update);
    const transactionsRemove = useMutation(api.transactions.remove);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getMutationFn = useCallback((path: string): ((args: any) => Promise<any>) | null => {
        switch (path) {
            case "notebooks:create": return notebooksCreate;
            case "notebooks:update": return notebooksUpdate;
            case "notebooks:remove": return notebooksRemove;
            case "contacts:create": return contactsCreate;
            case "contacts:update": return contactsUpdate;
            case "contacts:remove": return contactsRemove;
            case "transactions:create": return transactionsCreate;
            case "transactions:update": return transactionsUpdate;
            case "transactions:remove": return transactionsRemove;
            default: return null;
        }
    }, [
        notebooksCreate, notebooksUpdate, notebooksRemove,
        contactsCreate, contactsUpdate, contactsRemove,
        transactionsCreate, transactionsUpdate, transactionsRemove,
    ]);

    // Refresh pending count from IndexedDB
    const refreshCount = useCallback(async () => {
        try {
            const c = await offlineQueue.count();
            setPendingCount(c);
        } catch {
            // IndexedDB might not be available
        }
    }, []);

    // Online/offline detection
    useEffect(() => {
        setIsOnline(navigator.onLine);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Initial count
        refreshCount();

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [refreshCount]);

    // Flush queue: replay queued mutations when online, mapping temp IDs to real IDs
    const flushQueue = useCallback(async () => {
        if (flushingRef.current || !navigator.onLine) return;
        flushingRef.current = true;
        setIsSyncing(true);

        try {
            const queued = await offlineQueue.getAll();
            const idMap = new Map<string, string>(); // tempId → realId

            for (const item of queued) {
                const fn = getMutationFn(item.functionPath);
                if (!fn) {
                    // Unknown mutation, remove it
                    if (item.id) await offlineQueue.remove(item.id);
                    continue;
                }

                // Replace any temp IDs in args with real IDs from previous creates
                const patchedArgs = replaceTempIds(item.args, idMap);

                try {
                    const result = await fn(patchedArgs);

                    // If this was a create and we have a temp ID, store the mapping
                    if (item.tempId && result) {
                        idMap.set(item.tempId, result as string);
                    }

                    if (item.id) await offlineQueue.remove(item.id);
                } catch (err) {
                    // If still failing (not a network error), skip this item
                    // to avoid infinite retry loops for validation errors
                    const msg = (err as Error)?.message ?? "";
                    if (!msg.includes("fetch") && !msg.includes("network") && !msg.includes("Failed")) {
                        // Permanent failure — discard
                        if (item.id) await offlineQueue.remove(item.id);
                    } else {
                        // Network error — stop flushing, will retry later
                        break;
                    }
                }
            }
        } finally {
            await refreshCount();
            setIsSyncing(false);
            flushingRef.current = false;
        }
    }, [getMutationFn, refreshCount]);

    // Auto-flush when coming back online
    useEffect(() => {
        if (isOnline && pendingCount > 0) {
            flushQueue();
        }
    }, [isOnline, pendingCount, flushQueue]);

    // Periodic flush attempt (every 30s when online with pending items)
    useEffect(() => {
        if (!isOnline || pendingCount === 0) return;
        const interval = setInterval(() => {
            if (navigator.onLine && pendingCount > 0) {
                flushQueue();
            }
        }, 30_000);
        return () => clearInterval(interval);
    }, [isOnline, pendingCount, flushQueue]);

    // The main wrapper: try mutation, queue if offline/failed, always apply optimistic update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const offlineMutation = useCallback(async (
        functionPath: string,
        mutationFn: (args: any) => Promise<any>,
        args: Record<string, unknown>,
        optimisticCtx?: OptimisticContext
    ): Promise<any> => {
        // Apply optimistic update to cache (always, for instant UI feedback)
        const generatedTempId = await applyOptimisticUpdate(functionPath, args, optimisticCtx);

        if (!navigator.onLine) {
            // Queue for later sync
            await offlineQueue.enqueue({
                functionPath,
                args,
                queuedAt: Date.now(),
                tempId: generatedTempId,
            });
            await refreshCount();
            return generatedTempId;
        }

        try {
            const result = await mutationFn(args);
            return result;
        } catch (err) {
            const msg = (err as Error)?.message ?? "";
            // If it looks like a network error, queue it
            if (
                msg.includes("fetch") ||
                msg.includes("network") ||
                msg.includes("Failed") ||
                !navigator.onLine
            ) {
                await offlineQueue.enqueue({
                    functionPath,
                    args,
                    queuedAt: Date.now(),
                    tempId: generatedTempId,
                });
                await refreshCount();
                return generatedTempId;
            }
            // Otherwise rethrow (validation error, auth error, etc.)
            throw err;
        }
    }, [refreshCount]);

    const status: SyncStatus = isSyncing
        ? "syncing"
        : !isOnline
            ? "offline"
            : pendingCount > 0
                ? "pending"
                : "synced";

    return (
        <SyncContext.Provider
            value={{ status, pendingCount, isOnline, offlineMutation, flushQueue }}
        >
            {children}
        </SyncContext.Provider>
    );
}

export function useSync() {
    const ctx = useContext(SyncContext);
    if (!ctx) throw new Error("useSync must be used within SyncProvider");
    return ctx;
}

/** Replace temp IDs in mutation args with real IDs from the mapping */
function replaceTempIds(
    args: Record<string, unknown>,
    idMap: Map<string, string>
): Record<string, unknown> {
    if (idMap.size === 0) return args;
    const patched = { ...args };
    for (const [key, value] of Object.entries(patched)) {
        if (typeof value === "string" && idMap.has(value)) {
            patched[key] = idMap.get(value)!;
        }
    }
    return patched;
}
