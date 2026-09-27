import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, fireEvent, act, waitFor } from "@testing-library/react";
import SyncIndicator from "./SyncIndicator";
import { SyncProvider } from "@/contexts/SyncContext";
import { TestProviders } from "@/test/providers";
import * as offlineQueue from "@/lib/offlineQueue";
import { resetConvexMocks, setOnline } from "@/test/mocks";

vi.mock("convex/react", async () => {
    const m = await import("@/test/mocks");
    return m.convexReactMock();
});
vi.mock("@/convex/_generated/api", async () => {
    const m = await import("@/test/mocks");
    return { api: m.makeApiStub() };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProviders>
        <SyncProvider>{children}</SyncProvider>
    </TestProviders>
);

describe("SyncIndicator", () => {
    beforeEach(async () => {
        resetConvexMocks();
        localStorage.clear();
        await offlineQueue.resetDB();
        await offlineQueue.clear();
        setOnline(true);
    });

    it("renders nothing when synced", async () => {
        const { container } = render(<SyncIndicator />, { wrapper });
        await act(async () => {
            await new Promise((r) => setTimeout(r, 5));
        });
        expect(container.innerHTML).toBe("");
    });

    it("renders an offline badge and flushes on click when back online", async () => {
        setOnline(false);
        await offlineQueue.enqueue({
            functionPath: "notebooks:update",
            args: { id: "s1", name: "X" },
            queuedAt: 1,
        });
        const { container } = render(<SyncIndicator />, { wrapper });
        await act(async () => {
            await new Promise((r) => setTimeout(r, 5));
        });
        expect(container.querySelector("button")).not.toBeNull();

        setOnline(true);
        await act(async () => {
            fireEvent.click(container.querySelector("button") as Element);
            await new Promise((r) => setTimeout(r, 5));
        });
        expect(await offlineQueue.getAll()).toHaveLength(0);
    });

    it("shows the pending count while mutations are queued", async () => {
        Object.values(
            (await import("@/test/mocks")) as never
        );
        const mocks = await import("@/test/mocks");
        mocks.getConvexMutationMock("notebooks:update").mockRejectedValue(new Error("fetch failed"));

        await offlineQueue.enqueue({
            functionPath: "notebooks:update",
            args: { id: "s1" },
            queuedAt: 1,
        });
        const { container } = render(<SyncIndicator />, { wrapper });
        await act(async () => {
            await new Promise((r) => setTimeout(r, 5));
        });
        await waitFor(() =>
            expect(container.querySelector("button")?.title).toContain("1")
        );
    });
});
