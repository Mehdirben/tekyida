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
import * as offlineQueue from "@/lib/offlineQueue";
import { applyOptimisticUpdate, type OptimisticContext } from "@/lib/optimisticUpdates";
import { mutationRegistry } from "@/lib/mutationRegistry";

type SyncStatus = "synced" | "pending" | "syncing" | "offline";

interface SyncContextValue {
    /** Current sync status */
    status: SyncStatus;
    /** Number of mutations waiting to sync */
    pendingCount: number;
    /** Whether the browser is online */
    isOnline: boolean;
    /** Wraps a Convex mutation call — queues it if offline */
    offlineMutation: <Args extends Record<string, unknown>, Ret>(functionPath: string, mutationFn: (args: Args) => Promise<Ret>, args: Args, optimisticCtx?: OptimisticContext) => Promise<Ret>;
    /** Force flush the queue now */
    flushQueue: () => Promise<void>;
    /** Check if an item is pending sync (by its _id) */
    isItemPending: (id: string) => boolean;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
    const [isOnline, setIsOnline] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
    const flushingRef = useRef(false);

    // Get all mutation functions, keyed by offline queue function path
    const mutationFns: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
        "notebooks:create": useMutation(mutationRegistry["notebooks:create"]),
        "notebooks:update": useMutation(mutationRegistry["notebooks:update"]),
        "notebooks:archive": useMutation(mutationRegistry["notebooks:archive"]),
        "notebooks:remove": useMutation(mutationRegistry["notebooks:remove"]),
        "notebooks:reorder": useMutation(mutationRegistry["notebooks:reorder"]),
        "contacts:create": useMutation(mutationRegistry["contacts:create"]),
        "contacts:update": useMutation(mutationRegistry["contacts:update"]),
        "contacts:remove": useMutation(mutationRegistry["contacts:remove"]),
        "transactions:create": useMutation(mutationRegistry["transactions:create"]),
        "transactions:update": useMutation(mutationRegistry["transactions:update"]),
        "transactions:remove": useMutation(mutationRegistry["transactions:remove"]),
        "experiences:create": useMutation(mutationRegistry["experiences:create"]),
        "experiences:update": useMutation(mutationRegistry["experiences:update"]),
        "experiences:remove": useMutation(mutationRegistry["experiences:remove"]),
        "experiences:close": useMutation(mutationRegistry["experiences:close"]),
        "experiences:reopen": useMutation(mutationRegistry["experiences:reopen"]),
        "experiences:transfer": useMutation(mutationRegistry["experiences:transfer"]),
    };

    const getMutationFn = useCallback(
        (path: string): ((args: Record<string, unknown>) => Promise<unknown>) | null =>
            mutationFns[path] ?? null,
        // eslint-disable-next-line react-hooks/exhaustive-deps -- mutationFns values are stable (useMutation memoizes)
        []
    );

    // Refresh pending count and pending IDs from IndexedDB
    const refreshCount = useCallback(async () => {
        try {
            const items = await offlineQueue.getAll();
            setPendingCount(items.length);
            // Collect all IDs that are in the queue (temp IDs from creates, real IDs from updates/deletes)
            const ids = new Set<string>();
            for (const item of items) {
                if (item.tempId) ids.add(item.tempId);
                // For updates/deletes, the item's real ID is in args.id
                const argId = item.args?.id as string | undefined;
                if (argId) ids.add(argId);
            }
            setPendingIds(ids);
        } catch {
            // IndexedDB might not be available
        }
    }, []);

    // Online/offline detection
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sync initial value from browser API after mount to avoid SSR hydration mismatch
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

                // Safely skip any unmapped offline IDs so Convex's v.id() validator error is never triggered
                if (hasUnmappedTempId(patchedArgs)) {
                    if (item.id) await offlineQueue.remove(item.id);
                    continue;
                }

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
    const offlineMutation = useCallback(async <Args extends Record<string, unknown>, Ret>(
        functionPath: string,
        mutationFn: (args: Args) => Promise<Ret>,
        args: Args,
        optimisticCtx?: OptimisticContext
    ): Promise<Ret> => {
        // Apply optimistic update to cache (always, for instant UI feedback)
        const generatedTempId = await applyOptimisticUpdate(functionPath, args, optimisticCtx);

        const isRemove = functionPath.endsWith(":remove");
        const targetId = typeof args.id === "string" ? args.id : undefined;

        // 1. When an offline-created item (temp_*) is deleted while offline:
        // Purge its pending creation and any intermediate update mutations from the queue.
        // No remote remove mutation is enqueued because the server never had this item.
        if (isRemove && targetId && targetId.startsWith("temp_")) {
            await offlineQueue.purgeOfflineItem(targetId, functionPath);
            await refreshCount();
            return undefined as unknown as Ret;
        }

        // 2. When removing an existing server item while offline:
        // Redundant pending updates for that same item are purged.
        if (isRemove && targetId && !targetId.startsWith("temp_")) {
            await offlineQueue.purgePendingUpdates(targetId);
        }

        const pendingMutationsCount = await offlineQueue.count();

        // If offline, or if there are already pending mutations in the queue,
        // enqueue this mutation to preserve FIFO execution order.
        if (!navigator.onLine || pendingMutationsCount > 0) {
            await offlineQueue.enqueue({
                functionPath,
                args,
                queuedAt: Date.now(),
                tempId: generatedTempId,
            });
            await refreshCount();
            if (navigator.onLine) {
                void flushQueue();
            }
            return (generatedTempId ?? undefined) as unknown as Ret;
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
                return (generatedTempId ?? undefined) as unknown as Ret;
            }
            // Otherwise rethrow (validation error, auth error, etc.)
            throw err;
        }
    }, [refreshCount, flushQueue]);

    const status: SyncStatus = isSyncing
        ? "syncing"
        : !isOnline
            ? "offline"
            : pendingCount > 0
                ? "pending"
                : "synced";

    const isItemPending = useCallback((id: string): boolean => {
        // Items with temp_ prefix are always unsynced (created offline)
        if (id.startsWith("temp_")) return true;
        // Items whose real ID is in the queue (edited/deleted offline)
        return pendingIds.has(id);
    }, [pendingIds]);

    return (
        <SyncContext.Provider
            value={{ status, pendingCount, isOnline, offlineMutation, flushQueue, isItemPending }}
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

/** Check if any ID field still contains an unmapped temp_ ID */
function hasUnmappedTempId(args: Record<string, unknown>): boolean {
    const idFields = ["id", "notebookId", "contactId", "experienceId", "targetNotebookId"];
    for (const field of idFields) {
        const val = args[field];
        if (typeof val === "string" && val.startsWith("temp_")) {
            return true;
        }
    }
    if (Array.isArray(args.ids)) {
        if (args.ids.some((item) => typeof item === "string" && item.startsWith("temp_"))) {
            return true;
        }
    }
    return false;
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
        } else if (Array.isArray(value)) {
            patched[key] = value.map((item) =>
                typeof item === "string" && idMap.has(item) ? idMap.get(item)! : item
            );
        }
    }
    return patched;
}
