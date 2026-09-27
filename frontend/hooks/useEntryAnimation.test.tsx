import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEntryAnimation } from "./useEntryAnimation";

afterEach(() => {
    vi.useRealTimers();
});

describe("useEntryAnimation", () => {
    it("starts as true and becomes false after the default duration", () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useEntryAnimation());

        expect(result.current).toBe(true);

        act(() => {
            vi.advanceTimersByTime(900);
        });
        expect(result.current).toBe(false);
    });

    it("supports a custom duration", () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useEntryAnimation(200));

        act(() => {
            vi.advanceTimersByTime(199);
        });
        expect(result.current).toBe(true);

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(result.current).toBe(false);
    });
});
