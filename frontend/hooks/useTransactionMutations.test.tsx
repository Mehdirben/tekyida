import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { useTransactionMutations } from "./useTransactionMutations";
import { SyncProvider } from "@/contexts/SyncContext";
import { resetConvexMocks, getConvexMutationMock, setOnline } from "@/test/mocks";

vi.mock("convex/react", async () => {
    const m = await import("@/test/mocks");
    return m.convexReactMock();
});

vi.mock("@/convex/_generated/api", async () => {
    const m = await import("@/test/mocks");
    return { api: m.makeApiStub() };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SyncProvider>{children}</SyncProvider>
);

describe("useTransactionMutations", () => {
    beforeEach(() => {
        resetConvexMocks();
        localStorage.clear();
        setOnline(true);
    });

    afterEach(() => {
        setOnline(true);
    });

    it("exposes the three transaction mutations and sync helpers", async () => {
        const { result } = renderHook(() => useTransactionMutations(), { wrapper });

        expect(typeof result.current.createTransaction).toBe("function");
        expect(typeof result.current.deleteTransaction).toBe("function");
        expect(typeof result.current.updateTransaction).toBe("function");
        expect(typeof result.current.offlineMutation).toBe("function");
        expect(typeof result.current.isItemPending).toBe("function");
    });

    it("routes offlineMutation calls to the tracked convex mutations when online", async () => {
        const { result } = renderHook(() => useTransactionMutations(), { wrapper });

        await act(async () => {
            await result.current.offlineMutation(
                "transactions:create",
                result.current.createTransaction,
                { notebookId: "nb1" as never, amount: 10 }
            );
        });

        expect(getConvexMutationMock("transactions:create")).toHaveBeenCalledWith({
            notebookId: "nb1",
            amount: 10,
        });
    });

    it("flags temp IDs as pending", async () => {
        const { result } = renderHook(() => useTransactionMutations(), { wrapper });
        expect(result.current.isItemPending("temp_123")).toBe(true);
        expect(result.current.isItemPending("server_123")).toBe(false);
    });

    it("queues the mutation when offline", async () => {
        setOnline(false);
        const { result } = renderHook(() => useTransactionMutations(), { wrapper });

        let returned: unknown;
        await act(async () => {
            returned = await result.current.offlineMutation(
                "transactions:create",
                result.current.createTransaction,
                { notebookId: "nb1" as never, amount: 10 }
            );
        });

        expect(getConvexMutationMock("transactions:create")).not.toHaveBeenCalled();
        expect(typeof returned).toBe("string");
        expect(returned).toMatch(/^temp_/);
    });
});
