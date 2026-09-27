import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useActiveNotebook, readSavedActiveNotebook } from "./useActiveNotebook";
import { SyncProvider } from "@/contexts/SyncContext";
import * as queryCache from "@/lib/queryCache";
import {
    resetConvexMocks,
    getConvexMutationMock,
    setQueryResult,
    setOnline,
} from "@/test/mocks";

vi.mock("convex/react", async () => {
    const m = await import("@/test/mocks");
    return m.convexReactMock();
});

vi.mock("@/convex/_generated/api", async () => {
    const m = await import("@/test/mocks");
    return { api: m.makeApiStub() };
});

function makeNotebooks() {
    return [
        { _id: "nb1", name: "Personal", contactCount: 2, balance: 10, order: 0 },
        { _id: "nb2", name: "Work", contactCount: 1, balance: 0, order: 1 },
        { _id: "nb3", name: "Archived", contactCount: 0, balance: 0, order: 2, archived: true },
    ];
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SyncProvider>{children}</SyncProvider>
);

async function renderUseActiveNotebook() {
    const rendered = renderHook(() => useActiveNotebook(), { wrapper });
    await act(async () => {
        await new Promise((r) => setTimeout(r, 5));
    });
    return rendered;
}

describe("useActiveNotebook", () => {
    beforeEach(() => {
        resetConvexMocks();
        localStorage.clear();
        setOnline(true);
    });

    afterEach(async () => {
        setOnline(true);
        localStorage.clear();
        await queryCache.clear();
    });

    it("resolves the first active notebook when none is saved", async () => {
        setQueryResult("notebooks:list", makeNotebooks());
        const { result } = await renderUseActiveNotebook();
        expect(result.current.resolvedActiveId).toBe("nb1");
        expect(result.current.safeNotebooks.map((n) => n._id)).toEqual(["nb1", "nb2"]);
        expect(result.current.notebooks).toHaveLength(3);
        expect(result.current.isOffline).toBe(false);
    });

    it("keeps a saved valid selection", async () => {
        setQueryResult("notebooks:list", makeNotebooks());
        localStorage.setItem("tekyida-active-notebook", "nb2");
        const { result } = await renderUseActiveNotebook();
        expect(result.current.resolvedActiveId).toBe("nb2");
        expect(localStorage.getItem("tekyida-active-notebook")).toBe("nb2");
    });

    it("keeps an archived saved selection but does not re-persist it", async () => {
        setQueryResult("notebooks:list", makeNotebooks());
        localStorage.setItem("tekyida-active-notebook", "nb3");
        const { result } = await renderUseActiveNotebook();
        expect(result.current.resolvedActiveId).toBe("nb3");
        await act(async () => {
            await new Promise((r) => setTimeout(r, 10));
        });
        expect(localStorage.getItem("tekyida-active-notebook")).toBe("nb3");
    });

    it("removes the saved key when no notebooks exist", async () => {
        setQueryResult("notebooks:list", []);
        localStorage.setItem("tekyida-active-notebook", "nb1");
        const { result } = await renderUseActiveNotebook();
        expect(result.current.resolvedActiveId).toBeUndefined();
        expect(result.current.notebooks).toEqual([]);
        await waitFor(() =>
            expect(localStorage.getItem("tekyida-active-notebook")).toBeNull()
        );
    });

    it("persists a newly selected notebook", async () => {
        setQueryResult("notebooks:list", makeNotebooks());
        const { result } = await renderUseActiveNotebook();
        act(() => {
            result.current.setActiveNotebookId("nb2" as never);
        });
        expect(result.current.resolvedActiveId).toBe("nb2");
        await waitFor(() =>
            expect(localStorage.getItem("tekyida-active-notebook")).toBe("nb2")
        );
    });

    it("creates a notebook and switches to the optimistic temp entry", async () => {
        await queryCache.set(queryCache.cacheKey("notebooks.list", {}), makeNotebooks());
        getConvexMutationMock("notebooks:create").mockResolvedValue("nb_new");
        const { result } = await renderUseActiveNotebook();

        await act(async () => {
            await result.current.handleCreateNotebook("  Trip  ");
        });

        expect(getConvexMutationMock("notebooks:create")).toHaveBeenCalledWith({ name: "Trip" });
        expect(result.current.resolvedActiveId).toMatch(/^temp_/);
        expect(result.current.notebooks?.[0].name).toBe("Trip");
    });

    it("edits a notebook name", async () => {
        setQueryResult("notebooks:list", makeNotebooks());
        const { result } = await renderUseActiveNotebook();
        await act(async () => {
            await result.current.handleEditNotebook("nb1", "Renamed");
        });
        expect(getConvexMutationMock("notebooks:update")).toHaveBeenCalledWith({
            id: "nb1",
            name: "Renamed",
        });
    });

    it("clears the active selection when the active notebook is deleted", async () => {
        await queryCache.set(queryCache.cacheKey("notebooks.list", {}), makeNotebooks());
        const { result } = await renderUseActiveNotebook();
        expect(result.current.resolvedActiveId).toBe("nb1");

        await act(async () => {
            await result.current.handleDeleteNotebook("nb1");
        });
        expect(getConvexMutationMock("notebooks:remove")).toHaveBeenCalledWith({ id: "nb1" });
        expect(result.current.resolvedActiveId).toBe("nb2");
    });

    it("keeps the active selection when a non-active notebook is deleted", async () => {
        await queryCache.set(queryCache.cacheKey("notebooks.list", {}), makeNotebooks());
        const { result } = await renderUseActiveNotebook();
        await act(async () => {
            await result.current.handleDeleteNotebook("nb2");
        });
        expect(result.current.resolvedActiveId).toBe("nb1");
    });

    it("moves the selection to the next active notebook when archiving the active one", async () => {
        await queryCache.set(queryCache.cacheKey("notebooks.list", {}), makeNotebooks());
        const { result } = await renderUseActiveNotebook();
        await act(async () => {
            await result.current.handleArchiveNotebook("nb1", true);
        });
        expect(getConvexMutationMock("notebooks:archive")).toHaveBeenCalledWith({
            id: "nb1",
            archived: true,
        });
        expect(result.current.resolvedActiveId).toBe("nb2");
    });

    it("keeps the selection when archiving a non-active notebook", async () => {
        await queryCache.set(queryCache.cacheKey("notebooks.list", {}), makeNotebooks());
        const { result } = await renderUseActiveNotebook();
        await act(async () => {
            await result.current.handleArchiveNotebook("nb2", true);
        });
        expect(result.current.resolvedActiveId).toBe("nb1");
    });

    it("reorders notebooks", async () => {
        setQueryResult("notebooks:list", makeNotebooks());
        const { result } = await renderUseActiveNotebook();
        await act(async () => {
            await result.current.handleReorderNotebooks(["nb2", "nb1"]);
        });
        expect(getConvexMutationMock("notebooks:reorder")).toHaveBeenCalledWith({
            ids: ["nb2", "nb1"],
        });
    });

    it("reports offline status", async () => {
        setQueryResult("notebooks:list", makeNotebooks());
        setOnline(false);
        const { result } = await renderUseActiveNotebook();
        expect(result.current.isOffline).toBe(true);
    });

    it("reads no saved notebook during SSR", () => {
        const spy = vi.spyOn(globalThis, "window", "get").mockReturnValue(undefined as never);
        expect(readSavedActiveNotebook()).toBeUndefined();
        spy.mockRestore();
    });

    it("tolerates missing query data", async () => {
        const { result } = await renderUseActiveNotebook();
        expect(result.current.notebooks).toBeUndefined();
        expect(result.current.safeNotebooks).toEqual([]);
        expect(localStorage.getItem("tekyida-active-notebook")).toBeNull();
    });

    it("does not select a notebook when creation returns no ID", async () => {
        setQueryResult("notebooks:list", makeNotebooks());
        getConvexMutationMock("notebooks:create").mockResolvedValue(undefined);
        const { result } = await renderUseActiveNotebook();

        await act(async () => {
            await result.current.handleCreateNotebook("Trip");
        });

        expect(getConvexMutationMock("notebooks:create")).toHaveBeenCalledWith({ name: "Trip" });
        expect(result.current.resolvedActiveId).toBe("nb1");
    });
});
