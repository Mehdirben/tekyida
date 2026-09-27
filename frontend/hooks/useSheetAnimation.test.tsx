import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSheetAnimation } from "./useSheetAnimation";

afterEach(() => {
    vi.useRealTimers();
});

describe("useSheetAnimation", () => {
    it("starts with the entry animation active and ends it after 450ms", () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useSheetAnimation(vi.fn()));

        expect(result.current.animateIn).toBe(true);
        expect(result.current.isClosing).toBe(false);

        act(() => {
            vi.advanceTimersByTime(450);
        });
        expect(result.current.animateIn).toBe(false);
    });

    it("animates the close and calls onClose after 300ms", () => {
        vi.useFakeTimers();
        const onClose = vi.fn();
        const { result } = renderHook(() => useSheetAnimation(onClose));

        act(() => {
            result.current.handleAnimatedClose();
        });
        expect(result.current.isClosing).toBe(true);
        expect(onClose).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(300);
        });
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
