import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKeyboardInset } from "./useKeyboardInset";

describe("useKeyboardInset", () => {
    it("returns 0 when visualViewport is undefined", () => {
        const originalVv = window.visualViewport;
        // @ts-expect-error mock missing
        delete window.visualViewport;

        const { result } = renderHook(() => useKeyboardInset());
        expect(result.current).toBe(0);

        window.visualViewport = originalVv;
    });

    it("tracks keyboard inset via visualViewport and handles cleanup", () => {
        let resizeCb: () => void = () => {};
        let scrollCb: () => void = () => {};
        let orientCb: () => void = () => {};

        // @ts-expect-error mock visualViewport
        window.visualViewport = {
            height: 750,
            offsetTop: 0,
            addEventListener: vi.fn((event, cb) => {
                if (event === "resize") resizeCb = cb;
                if (event === "scroll") scrollCb = cb;
            }),
            removeEventListener: vi.fn(),
        };
        window.innerHeight = 800;
        const orientSpy = vi.spyOn(window, "addEventListener").mockImplementation((event, cb) => {
            if (event === "orientationchange") orientCb = cb as () => void;
        });
        const orientRemoveSpy = vi.spyOn(window, "removeEventListener");

        const { result, unmount } = renderHook(() => useKeyboardInset());
        expect(result.current).toBe(0);

        act(() => {
            // @ts-expect-error mock
            window.visualViewport.height = 400;
            resizeCb();
        });
        expect(result.current).toBe(400);

        act(() => {
            scrollCb();
        });
        expect(result.current).toBe(400);

        act(() => {
            orientCb();
        });
        expect(result.current).toBe(400);

        unmount();
        expect(window.visualViewport?.removeEventListener).toHaveBeenCalled();
        orientSpy.mockRestore();
        orientRemoveSpy.mockRestore();
    });
});
