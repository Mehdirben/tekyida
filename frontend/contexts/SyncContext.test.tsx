import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { SyncProvider, useSync } from "./SyncContext";
import * as offlineQueue from "@/lib/offlineQueue";

// Mock convex mutations
type MockMutationFn = ReturnType<typeof vi.fn> & ((args: any) => Promise<any>);

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
            tempTxId = await result.current.offlineMutation(
                "transactions:create",
                mockMutations["transactions:create"],
                { notebookId: "nb1", amount: 100, description: "Groceries" }
            );
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
