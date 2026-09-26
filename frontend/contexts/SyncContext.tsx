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

    // Get all mutation functions
    const notebooksCreate = useMutation(api.notebooks.create);
    const notebooksUpdate = useMutation(api.notebooks.update);
    const notebooksArchive = useMutation(api.notebooks.archive);
    const notebooksRemove = useMutation(api.notebooks.remove);
    const notebooksReorder = useMutation(api.notebooks.reorder);
    const contactsCreate = useMutation(api.contacts.create);
    const contactsUpdate = useMutation(api.contacts.update);
    const contactsRemove = useMutation(api.contacts.remove);
    const transactionsCreate = useMutation(api.transactions.create);
    const transactionsUpdate = useMutation(api.transactions.update);
    const transactionsRemove = useMutation(api.transactions.remove);
    const experiencesCreate = useMutation(api.experiences.create);
    const experiencesUpdate = useMutation(api.experiences.update);
    const experiencesRemove = useMutation(api.experiences.remove);
    const experiencesClose = useMutation(api.experiences.close);
    const experiencesReopen = useMutation(api.experiences.reopen);
    const experiencesTransfer = useMutation(api.experiences.transfer);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getMutationFn = useCallback((path: string): ((args: any) => Promise<any>) | null => {
        switch (path) {
            case "notebooks:create": return notebooksCreate;
            case "notebooks:update": return notebooksUpdate;
            case "notebooks:archive": return notebooksArchive;
            case "notebooks:remove": return notebooksRemove;
            case "notebooks:reorder": return notebooksReorder;
            case "contacts:create": return contactsCreate;
            case "contacts:update": return contactsUpdate;
            case "contacts:remove": return contactsRemove;
            case "transactions:create": return transactionsCreate;
            case "transactions:update": return transactionsUpdate;
            case "transactions:remove": return transactionsRemove;
            case "experiences:create": return experiencesCreate;
            case "experiences:update": return experiencesUpdate;
            case "experiences:remove": return experiencesRemove;
            case "experiences:close": return experiencesClose;
            case "experiences:reopen": return experiencesReopen;
            case "experiences:transfer": return experiencesTransfer;
            default: return null;
        }
    }, [
        notebooksCreate, notebooksUpdate, notebooksArchive, notebooksRemove, notebooksReorder,
        contactsCreate, contactsUpdate, contactsRemove,
        transactionsCreate, transactionsUpdate, transactionsRemove,
        experiencesCreate, experiencesUpdate, experiencesRemove,
        experiencesClose, experiencesReopen, experiencesTransfer,
    ]);

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
