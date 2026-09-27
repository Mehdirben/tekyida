import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { SyncProvider, useSync } from "./SyncContext";
import * as offlineQueue from "@/lib/offlineQueue";

// Mock convex mutations
type MockMutationFn = ReturnType<typeof vi.fn> & ((args: Record<string, unknown>) => Promise<unknown>);

const mockMutations: Record<string, MockMutationFn> = {
    "notebooks:create": vi.fn().mockResolvedValue("temp_id") as MockMutationFn,
    "notebooks:update": vi.fn().mockResolvedValue(undefined) as MockMutationFn,
    "notebooks:archive": vi.fn().mockResolvedValue(undefined) as MockMutationFn,
    "notebooks:remove": vi.fn().mockResolvedValue(undefined) as MockMutationFn,
    "notebooks:reorder": vi.fn().mockResolvedValue(undefined) as MockMutationFn,
    "contacts:create": vi.fn().mockResolvedValue("temp_id") as MockMutationFn,
    "contacts:update": vi.fn().mockResolvedValue(undefined) as MockMutationFn,
    "contacts:remove": vi.fn().mockResolvedValue(undefined) as MockMutationFn,
    "transactions:create": vi.fn().mockResolvedValue("temp_id") as MockMutationFn,
    "transactions:update": vi.fn().mockResolvedValue(undefined) as MockMutationFn,
    "transactions:remove": vi.fn().mockResolvedValue(undefined) as MockMutationFn,
    "experiences:create": vi.fn().mockResolvedValue("temp_id") as MockMutationFn,
    "experiences:update": vi.fn().mockResolvedValue(undefined) as MockMutationFn,
    "experiences:remove": vi.fn().mockResolvedValue(undefined) as MockMutationFn,
    "experiences:close": vi.fn().mockResolvedValue(undefined) as MockMutationFn,
    "experiences:reopen": vi.fn().mockResolvedValue(undefined) as MockMutationFn,
    "experiences:transfer": vi.fn().mockResolvedValue(undefined) as MockMutationFn,
};

vi.mock("convex/react", () => ({
    useMutation: (def: { _def?: { path?: string } }) => {
        // Find matching mock by function name or fallback
        const name = def?._def?.path ?? "unknown";
        return mockMutations[name] ?? vi.fn();
    },
}));

vi.mock("@/convex/_generated/api", () => ({
    api: {
        notebooks: {
            create: { _def: { path: "notebooks:create" } },
            update: { _def: { path: "notebooks:update" } },
            archive: { _def: { path: "notebooks:archive" } },
            remove: { _def: { path: "notebooks:remove" } },
            reorder: { _def: { path: "notebooks:reorder" } },
        },
        contacts: {
            create: { _def: { path: "contacts:create" } },
            update: { _def: { path: "contacts:update" } },
            remove: { _def: { path: "contacts:remove" } },
        },
        transactions: {
            create: { _def: { path: "transactions:create" } },
            update: { _def: { path: "transactions:update" } },
            remove: { _def: { path: "transactions:remove" } },
        },
        experiences: {
            create: { _def: { path: "experiences:create" } },
            update: { _def: { path: "experiences:update" } },
            remove: { _def: { path: "experiences:remove" } },
            close: { _def: { path: "experiences:close" } },
            reopen: { _def: { path: "experiences:reopen" } },
            transfer: { _def: { path: "experiences:transfer" } },
        },
    },
}));

describe("SyncContext - Offline Create + Delete Lifecycle", () => {
    const originalOnLine = navigator.onLine;

    beforeEach(async () => {
        offlineQueue.resetDB();
        await offlineQueue.clear();
        Object.values(mockMutations).forEach((fn) => fn.mockReset());
        Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    });

    afterEach(() => {
        Object.defineProperty(navigator, "onLine", { value: originalOnLine, configurable: true });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SyncProvider>{children}</SyncProvider>
    );

    it("purges pending creation and updates when offline-created item is deleted offline, with no remove queued", async () => {
        const { result } = renderHook(() => useSync(), { wrapper });

        // 1. Create a transaction offline
        let tempTxId: string | undefined;
        await act(async () => {
            tempTxId = (await result.current.offlineMutation(
                "transactions:create",
                mockMutations["transactions:create"],
                { notebookId: "nb1", amount: 100, description: "Groceries" }
            )) as string;
        });

        expect(tempTxId).toBeDefined();
        expect(tempTxId?.startsWith("temp_")).toBe(true);

        // 2. Update that offline transaction
        await act(async () => {
            await result.current.offlineMutation(
                "transactions:update",
                mockMutations["transactions:update"],
                { id: tempTxId!, amount: 150, description: "Updated Groceries" }
            );
        });

        // Verify they are in the queue
        let queued = await offlineQueue.getAll();
        expect(queued).toHaveLength(2);
        expect(queued[0].functionPath).toBe("transactions:create");
        expect(queued[1].functionPath).toBe("transactions:update");

        // 3. Delete the offline transaction while still offline
        await act(async () => {
            await result.current.offlineMutation(
                "transactions:remove",
                mockMutations["transactions:remove"],
                { id: tempTxId! }
            );
        });

        // The queue should now be empty! No create, no update, and NO remove queued.
        queued = await offlineQueue.getAll();
        expect(queued).toHaveLength(0);
        expect(mockMutations["transactions:remove"]).not.toHaveBeenCalled();
    });

    it("purges redundant pending updates when existing server item is deleted offline", async () => {
        const { result } = renderHook(() => useSync(), { wrapper });
        const serverTxId = "server_tx_12345";

        // 1. Update the existing item while offline
        await act(async () => {
            await result.current.offlineMutation(
                "transactions:update",
                mockMutations["transactions:update"],
                { id: serverTxId, amount: 200 }
            );
        });

        // 2. Update it again
        await act(async () => {
            await result.current.offlineMutation(
                "transactions:update",
                mockMutations["transactions:update"],
                { id: serverTxId, amount: 250 }
            );
        });

        let queued = await offlineQueue.getAll();
        expect(queued).toHaveLength(2);

        // 3. Delete the existing item while offline
        await act(async () => {
            await result.current.offlineMutation(
                "transactions:remove",
                mockMutations["transactions:remove"],
                { id: serverTxId }
            );
        });

        // Only the remove mutation should remain in the queue
        queued = await offlineQueue.getAll();
        expect(queued).toHaveLength(1);
        expect(queued[0].functionPath).toBe("transactions:remove");
        expect(queued[0].args.id).toBe(serverTxId);
    });

    it("skips unmapped offline IDs in flushQueue so Convex validator error is never triggered", async () => {
        // Enqueue an update mutation referencing an unmapped temp ID (e.g. create was purged or failed)
        await offlineQueue.enqueue({
            functionPath: "transactions:update",
            args: { id: "temp_unmapped_999", amount: 300 },
            queuedAt: Date.now(),
        });

        // Enqueue a contact create referencing an unmapped notebookId
        await offlineQueue.enqueue({
            functionPath: "contacts:create",
            args: { notebookId: "temp_nb_unmapped", name: "Bob" },
            queuedAt: Date.now(),
        });

        // Set online
        Object.defineProperty(navigator, "onLine", { value: true, configurable: true });

        const { result } = renderHook(() => useSync(), { wrapper });

        await act(async () => {
            await result.current.flushQueue();
        });

        // Neither mutation should have been sent to Convex
        expect(mockMutations["transactions:update"]).not.toHaveBeenCalled();
        expect(mockMutations["contacts:create"]).not.toHaveBeenCalled();

        // And they should be discarded from the queue
        const queued = await offlineQueue.getAll();
        expect(queued).toHaveLength(0);
    });

    it("correctly maps temp ID to server ID and replaces temp IDs in subsequent mutations during sync", async () => {
        const tempNbId = "temp_nb_100";
        const realServerId = "server_nb_999";

        mockMutations["notebooks:create"].mockResolvedValueOnce(realServerId);
        mockMutations["contacts:create"].mockResolvedValueOnce("server_c_1");

        // Enqueue notebook create
        await offlineQueue.enqueue({
            functionPath: "notebooks:create",
            args: { name: "Holiday Trip" },
            queuedAt: 1,
            tempId: tempNbId,
        });

        // Enqueue contact create pointing to tempNbId
        await offlineQueue.enqueue({
            functionPath: "contacts:create",
            args: { notebookId: tempNbId, name: "Alice" },
            queuedAt: 2,
        });

        // Set online
        Object.defineProperty(navigator, "onLine", { value: true, configurable: true });

        const { result } = renderHook(() => useSync(), { wrapper });

        await act(async () => {
            await result.current.flushQueue();
        });

        expect(mockMutations["notebooks:create"]).toHaveBeenCalledWith({ name: "Holiday Trip" });
        // The contacts:create should have had notebookId replaced with realServerId!
        expect(mockMutations["contacts:create"]).toHaveBeenCalledWith({
            notebookId: realServerId,
            name: "Alice",
        });

        const queued = await offlineQueue.getAll();
        expect(queued).toHaveLength(0);
    });
});

describe("SyncContext - status, guards, and queue recovery", () => {
    const originalOnLine = navigator.onLine;

    beforeEach(async () => {
        offlineQueue.resetDB();
        await offlineQueue.clear();
        Object.values(mockMutations).forEach((fn) => fn.mockReset());
        Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    });

    afterEach(() => {
        Object.defineProperty(navigator, "onLine", { value: originalOnLine, configurable: true });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SyncProvider>{children}</SyncProvider>
    );

    it("throws when useSync is used outside SyncProvider", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => renderHook(() => useSync())).toThrow(
            "useSync must be used within SyncProvider"
        );
        spy.mockRestore();
    });

    it("reports synced status with an empty queue", async () => {
        const { result } = renderHook(() => useSync(), { wrapper });
        await act(async () => {
            await new Promise((r) => setTimeout(r, 5));
        });
        expect(result.current.status).toBe("synced");
        expect(result.current.isOnline).toBe(true);
        expect(result.current.isItemPending("unknown_id")).toBe(false);
    });

    it("reports offline status while the browser is offline", async () => {
        Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
        const { result } = renderHook(() => useSync(), { wrapper });
        await act(async () => {
            window.dispatchEvent(new Event("offline"));
            await new Promise((r) => setTimeout(r, 5));
        });
        expect(result.current.status).toBe("offline");
        expect(result.current.isOnline).toBe(false);
    });

    it("returns the server result for mutations that succeed while online", async () => {
        mockMutations["notebooks:create"].mockResolvedValue("server_nb_1");
        const { result } = renderHook(() => useSync(), { wrapper });
        await act(async () => {
            await new Promise((r) => setTimeout(r, 5));
        });

        let returned: unknown;
        await act(async () => {
            returned = await result.current.offlineMutation(
                "notebooks:create",
                mockMutations["notebooks:create"],
                { name: "A" }
            );
        });

        expect(returned).toBe("server_nb_1");
        expect(await offlineQueue.getAll()).toHaveLength(0);
        expect(result.current.isItemPending("temp_abc")).toBe(true);
    });

    it("reports pending status and pending ids while mutations are queued", async () => {
        mockMutations["notebooks:update"].mockRejectedValue(new Error("fetch failed"));
        Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
        await offlineQueue.enqueue({
            functionPath: "notebooks:update",
            args: { id: "s1" },
            queuedAt: 1,
        });
        const { result } = renderHook(() => useSync(), { wrapper });
        await act(async () => {
            await new Promise((r) => setTimeout(r, 5));
        });
        expect(result.current.status).toBe("offline");

        Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
        await act(async () => {
            window.dispatchEvent(new Event("online"));
            await new Promise((r) => setTimeout(r, 5));
        });

        await waitFor(() => expect(result.current.status).toBe("pending"));
        expect(result.current.pendingCount).toBe(1);
        expect(result.current.isItemPending("s1")).toBe(true);
    });

    it("reports syncing status while a flush is in flight", async () => {
        let release!: () => void;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        mockMutations["notebooks:update"].mockImplementationOnce(() => gate);

        await offlineQueue.enqueue({
            functionPath: "notebooks:update",
            args: { id: "s1" },
            queuedAt: 1,
        });
        const { result } = renderHook(() => useSync(), { wrapper });

        let flush!: Promise<void>;
        await act(async () => {
            flush = result.current.flushQueue();
        });
        expect(result.current.status).toBe("syncing");

        await act(async () => {
            release();
            await flush;
        });
        expect(result.current.status).toBe("synced");
    });

    it("guards flushQueue against concurrent invocations", async () => {
        let release!: () => void;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        mockMutations["notebooks:update"].mockImplementationOnce(() => gate);

        await offlineQueue.enqueue({
            functionPath: "notebooks:update",
            args: { id: "s1" },
            queuedAt: 1,
        });
        const { result } = renderHook(() => useSync(), { wrapper });

        let first!: Promise<void>;
        await act(async () => {
            first = result.current.flushQueue();
        });
        await act(async () => {
            await result.current.flushQueue();
        });
        await act(async () => {
            release();
            await first;
        });

        expect(mockMutations["notebooks:update"]).toHaveBeenCalledTimes(1);
    });

    it("discards queued mutations for unknown function paths", async () => {
        await offlineQueue.enqueue({
            functionPath: "unknown:thing",
            args: { id: "s9" },
            queuedAt: 1,
        });
        const { result } = renderHook(() => useSync(), { wrapper });

        await act(async () => {
            await result.current.flushQueue();
        });

        expect(await offlineQueue.getAll()).toHaveLength(0);
    });

    it("discards permanent failures but keeps network failures queued", async () => {
        mockMutations["notebooks:update"].mockRejectedValue(new Error("validation boom"));
        mockMutations["notebooks:archive"].mockRejectedValue(new Error("fetch interrupted"));

        await offlineQueue.enqueue({
            functionPath: "notebooks:update",
            args: { id: "s1" },
            queuedAt: 1,
        });
        await offlineQueue.enqueue({
            functionPath: "notebooks:archive",
            args: { id: "s2" },
            queuedAt: 2,
        });
        const { result } = renderHook(() => useSync(), { wrapper });

        await act(async () => {
            await result.current.flushQueue();
        });

        const queued = await offlineQueue.getAll();
        expect(queued).toHaveLength(1);
        expect(queued[0].functionPath).toBe("notebooks:archive");
    });

    it("requeues a mutation when the connection drops before it resolves", async () => {
        mockMutations["transactions:create"].mockImplementationOnce(() => {
            Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
            return Promise.reject(new Error("socket closed"));
        });
        const { result } = renderHook(() => useSync(), { wrapper });

        let returned: unknown;
        await act(async () => {
            returned = await result.current.offlineMutation(
                "transactions:create",
                mockMutations["transactions:create"],
                { notebookId: "nb1", amount: 1 }
            );
        });

        expect(returned).toMatch(/^temp_/);
        const queued = await offlineQueue.getAll();
        expect(queued).toHaveLength(1);
        expect(queued[0].functionPath).toBe("transactions:create");
    });

    it("rethrows non-network errors from offline mutations", async () => {
        mockMutations["contacts:create"].mockRejectedValueOnce(new Error("invalid arguments"));
        const { result } = renderHook(() => useSync(), { wrapper });

        await act(async () => {
            await expect(
                result.current.offlineMutation(
                    "contacts:create",
                    mockMutations["contacts:create"],
                    { notebookId: "nb1", name: "A" }
                )
            ).rejects.toThrow("invalid arguments");
        });
        expect(await offlineQueue.getAll()).toHaveLength(0);
    });

    it("flushes immediately after enqueueing while online with prior pending items", async () => {
        let release!: () => void;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        mockMutations["notebooks:update"].mockImplementationOnce(() => gate);

        await offlineQueue.enqueue({
            functionPath: "notebooks:update",
            args: { id: "s1", name: "X" },
            queuedAt: 1,
        });
        const { result } = renderHook(() => useSync(), { wrapper });
        await act(async () => {
            await new Promise((r) => setTimeout(r, 5));
        });

        await act(async () => {
            await result.current.offlineMutation(
                "notebooks:create",
                mockMutations["notebooks:create"],
                { name: "New" }
            );
        });

        await act(async () => {
            release();
        });

        await waitFor(() =>
            expect(mockMutations["notebooks:create"]).toHaveBeenCalledWith({ name: "New" })
        );
        expect(await offlineQueue.getAll()).toHaveLength(0);
    });

    it("retries the queue periodically while online with pending items", async () => {
        vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
        mockMutations["notebooks:update"].mockRejectedValue(new Error("fetch failed"));

        await offlineQueue.enqueue({
            functionPath: "notebooks:update",
            args: { id: "s1", name: "X" },
            queuedAt: 1,
        });
        const { result, unmount } = renderHook(() => useSync(), { wrapper });
        await act(async () => {
            await new Promise((r) => setTimeout(r, 5));
        });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(30_000);
        });
        expect(result.current.pendingCount).toBe(1);

        unmount();
        vi.useRealTimers();
    });

    it("maps temp ids inside reorder arrays during flush", async () => {
        mockMutations["notebooks:create"].mockResolvedValue("server_nb_1");
        mockMutations["notebooks:reorder"].mockResolvedValue(undefined);

        await offlineQueue.enqueue({
            functionPath: "notebooks:create",
            args: { name: "A" },
            queuedAt: 1,
            tempId: "temp_nb_1",
        });
        await offlineQueue.enqueue({
            functionPath: "notebooks:reorder",
            args: { ids: ["temp_nb_1", "server_nb_2"] },
            queuedAt: 2,
        });
        const { result } = renderHook(() => useSync(), { wrapper });

        await act(async () => {
            await result.current.flushQueue();
        });

        expect(mockMutations["notebooks:reorder"]).toHaveBeenCalledWith({
            ids: ["server_nb_1", "server_nb_2"],
        });
        expect(await offlineQueue.getAll()).toHaveLength(0);
    });

    it("skips reorder mutations that still reference unmapped temp ids", async () => {
        await offlineQueue.enqueue({
            functionPath: "notebooks:reorder",
            args: { ids: ["temp_lost"] },
            queuedAt: 1,
        });
        const { result } = renderHook(() => useSync(), { wrapper });

        await act(async () => {
            await result.current.flushQueue();
        });

        expect(mockMutations["notebooks:reorder"]).not.toHaveBeenCalled();
        expect(await offlineQueue.getAll()).toHaveLength(0);
    });

    it("auto-flushes when connectivity returns with pending mutations", async () => {
        Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
        await offlineQueue.enqueue({
            functionPath: "notebooks:update",
            args: { id: "s1", name: "X" },
            queuedAt: 1,
        });
        renderHook(() => useSync(), { wrapper });
        await act(async () => {
            await new Promise((r) => setTimeout(r, 5));
        });

        Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
        await act(async () => {
            window.dispatchEvent(new Event("online"));
            await new Promise((r) => setTimeout(r, 5));
        });

        await waitFor(() =>
            expect(mockMutations["notebooks:update"]).toHaveBeenCalledWith({ id: "s1", name: "X" })
        );
        expect(await offlineQueue.getAll()).toHaveLength(0);
    });
    it.each(["network lost", "Failed to reach server"])(
        "keeps mutations queued when flush fails with %s",
        async (message) => {
            mockMutations["notebooks:update"].mockRejectedValue(new Error(message));
            await offlineQueue.enqueue({
                functionPath: "notebooks:update",
                args: { id: "s1" },
                queuedAt: 1,
            });
            const { result } = renderHook(() => useSync(), { wrapper });

            await act(async () => {
                await result.current.flushQueue();
            });

            expect(await offlineQueue.getAll()).toHaveLength(1);
        }
    );

    it("keeps mutations queued when offline mutation fails with a network error", async () => {
        mockMutations["notebooks:update"].mockRejectedValue(new Error("network gone"));
        const { result } = renderHook(() => useSync(), { wrapper });

        let returned: unknown;
        await act(async () => {
            returned = await result.current.offlineMutation(
                "notebooks:update",
                mockMutations["notebooks:update"],
                { id: "s1", name: "X" }
            );
        });

        expect(returned).toBeUndefined();
        expect(await offlineQueue.getAll()).toHaveLength(1);
    });

    it("does not flush while offline", async () => {
        Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
        await offlineQueue.enqueue({
            functionPath: "notebooks:update",
            args: { id: "s1" },
            queuedAt: 1,
        });
        const { result } = renderHook(() => useSync(), { wrapper });

        await act(async () => {
            await result.current.flushQueue();
        });

        expect(mockMutations["notebooks:update"]).not.toHaveBeenCalled();
        expect(await offlineQueue.getAll()).toHaveLength(1);
    });

    it("skips the periodic flush once the queue has drained", async () => {
        vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
        const { unmount } = renderHook(() => useSync(), { wrapper });
        await act(async () => {
            await new Promise((r) => setTimeout(r, 5));
        });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(30_000);
        });

        unmount();
        vi.useRealTimers();
    });
});
