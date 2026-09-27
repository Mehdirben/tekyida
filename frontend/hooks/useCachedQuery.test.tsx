import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCachedQuery } from "./useCachedQuery";
import * as queryCache from "@/lib/queryCache";
import { setOnline } from "@/test/mocks";

vi.mock("convex/react", async () => {
    const m = await import("@/test/mocks");
    return m.convexReactMock();
});

afterEach(() => {
    vi.restoreAllMocks();
    setOnline(true);
    localStorage.clear();
});

const funcRef = { _def: { path: "contacts:list" } };

/** useQuery stub that respects the "skip" sentinel like the real convex client. */
async function stubLiveQuery(live: unknown) {
    return vi
        .spyOn(await import("convex/react"), "useQuery")
        .mockImplementation(((...callArgs: unknown[]) =>
            callArgs[1] === "skip" ? undefined : live) as never);
}

describe("useCachedQuery", () => {
    it("returns live data when online and writes it to the cache", async () => {
        const key = queryCache.cacheKey("contacts:list", { notebookId: "nb1" });
        await queryCache.clear();
        const setSpy = vi.spyOn(queryCache, "set");
        await stubLiveQuery([{ _id: "c1", name: "Live" }]);

        const { result } = renderHook(() =>
            useCachedQuery<{ _id: string }[]>("contacts:list", funcRef, { notebookId: "nb1" })
        );

        expect(result.current).toEqual([{ _id: "c1", name: "Live" }]);
        await waitFor(() => expect(setSpy).toHaveBeenCalledWith(key, [{ _id: "c1", name: "Live" }]));

        setSpy.mockRestore();
        await queryCache.clear();
    });

    it("serves cached data when the live query has no data yet", async () => {
        const key = queryCache.cacheKey("contacts:list", { notebookId: "nb2" });
        await queryCache.set(key, [{ _id: "c2", name: "Cached" }]);
        await stubLiveQuery(undefined);

        const { result } = renderHook(() =>
            useCachedQuery<{ _id: string }[]>("contacts:list", funcRef, { notebookId: "nb2" })
        );

        await waitFor(() => expect(result.current).toEqual([{ _id: "c2", name: "Cached" }]));
        await queryCache.clear();
    });

    it("skips the live query entirely for temp_ ID args", async () => {
        const key = queryCache.cacheKey("transactions:list", { contactId: "temp_abc" });
        await queryCache.set(key, [{ _id: "t1", amount: 5 }]);

        const useQuerySpy = vi
            .spyOn(await import("convex/react"), "useQuery")
            .mockImplementation(((...callArgs: unknown[]) =>
                callArgs[1] === "skip" ? undefined : [{ _id: "live" }]) as never);

        const { result } = renderHook(() =>
            useCachedQuery<{ _id: string }[]>(
                "transactions:list",
                { _def: { path: "transactions:list" } },
                { contactId: "temp_abc" }
            )
        );

        expect(useQuerySpy).toHaveBeenCalledWith(expect.anything(), "skip");
        await waitFor(() => expect(result.current).toEqual([{ _id: "t1", amount: 5 }]));

        useQuerySpy.mockRestore();
        await queryCache.clear();
    });

    it("supports the skip sentinel", async () => {
        const useQuerySpy = vi
            .spyOn(await import("convex/react"), "useQuery")
            .mockImplementation(() => undefined);

        const { result } = renderHook(() =>
            useCachedQuery<{ _id: string }[]>("contacts:list", funcRef, "skip")
        );

        expect(useQuerySpy).toHaveBeenCalledWith(expect.anything(), "skip");
        expect(result.current).toBeUndefined();
        useQuerySpy.mockRestore();
    });

    it("serves optimistic cache updates while offline instead of stale live data", async () => {
        const key = queryCache.cacheKey("contacts:list", { notebookId: "nb3" });
        await queryCache.set(key, [{ _id: "c3", name: "Initial" }]);
        await stubLiveQuery([{ _id: "c3", name: "StaleLive" }]);

        const { result } = renderHook(() =>
            useCachedQuery<{ _id: string }[]>("contacts:list", funcRef, { notebookId: "nb3" })
        );

        await waitFor(() => expect(result.current).toEqual([{ _id: "c3", name: "StaleLive" }]));

        setOnline(false);
        await act(async () => {
            window.dispatchEvent(new Event("offline"));
            await new Promise((r) => setTimeout(r, 5));
        });

        await act(async () => {
            await queryCache.set(key, [{ _id: "c3", name: "Optimistic" }]);
        });

        expect(result.current).toEqual([{ _id: "c3", name: "Optimistic" }]);
        await queryCache.clear();
    });

    it("resets cached state when the key changes between renders", async () => {
        const keyA = queryCache.cacheKey("contacts:list", { notebookId: "nbA" });
        const keyB = queryCache.cacheKey("contacts:list", { notebookId: "nbB" });
        await queryCache.set(keyA, [{ _id: "a" }]);
        await queryCache.set(keyB, [{ _id: "b" }]);
        await stubLiveQuery(undefined);

        const { result, rerender } = renderHook(
            ({ notebookId }) =>
                useCachedQuery<{ _id: string }[]>("contacts:list", funcRef, { notebookId }),
            { initialProps: { notebookId: "nbA" } }
        );

        await waitFor(() => expect(result.current).toEqual([{ _id: "a" }]));

        rerender({ notebookId: "nbB" });
        await waitFor(() => expect(result.current).toEqual([{ _id: "b" }]));

        await queryCache.clear();
    });

    it("re-reads the cache when an optimistic update notifies a matching key", async () => {
        setOnline(false);
        const key = queryCache.cacheKey("contacts:list", { notebookId: "nb4" });
        await queryCache.set(key, [{ _id: "c4", name: "Before" }]);
        await stubLiveQuery(undefined);

        const { result } = renderHook(() =>
            useCachedQuery<{ _id: string }[]>("contacts:list", funcRef, { notebookId: "nb4" })
        );
        await waitFor(() => expect(result.current).toEqual([{ _id: "c4", name: "Before" }]));

        await act(async () => {
            await queryCache.set(key, [{ _id: "c4", name: "After" }]);
        });

        expect(result.current).toEqual([{ _id: "c4", name: "After" }]);
        await queryCache.clear();
    });

    it("resets to empty when the query is skipped after having a key", async () => {
        await stubLiveQuery(undefined);
        const { result, rerender } = renderHook(
            ({ args }) =>
                useCachedQuery<{ _id: string }[]>("contacts:list", funcRef, args),
            { initialProps: { args: { notebookId: "nb5" } as Record<string, unknown> | "skip" } }
        );

        await waitFor(() => expect(result.current).toBeUndefined());

        rerender({ args: "skip" });
        expect(result.current).toBeUndefined();
    });

    it("ignores cache notifications for other keys", async () => {
        const key = queryCache.cacheKey("contacts:list", { notebookId: "nb7" });
        await queryCache.set(key, [{ _id: "c7", name: "Mine" }]);
        await stubLiveQuery(undefined);

        const { result } = renderHook(() =>
            useCachedQuery<{ _id: string }[]>("contacts:list", funcRef, { notebookId: "nb7" })
        );
        await waitFor(() => expect(result.current).toEqual([{ _id: "c7", name: "Mine" }]));

        await act(async () => {
            await queryCache.set(queryCache.cacheKey("contacts:list", { notebookId: "other" }), [
                { _id: "other" },
            ]);
        });

        expect(result.current).toEqual([{ _id: "c7", name: "Mine" }]);
        await queryCache.clear();
    });

    it("cleans up listeners and subscriptions on unmount", async () => {
        await stubLiveQuery(undefined);
        const removeSpy = vi.spyOn(window, "removeEventListener");
        const { unmount } = renderHook(() =>
            useCachedQuery<{ _id: string }[]>("contacts:list", funcRef, { notebookId: "nb6" })
        );

        unmount();
        expect(removeSpy).toHaveBeenCalledWith("online", expect.any(Function));
        expect(removeSpy).toHaveBeenCalledWith("offline", expect.any(Function));
        removeSpy.mockRestore();
    });
});
