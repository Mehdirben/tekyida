import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { useEscapeCascade } from "./useEscapeCascade";

function pressEscape() {
    act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
}

describe("useEscapeCascade", () => {
    it("fires the handler when Escape is pressed", () => {
        const onEscape = vi.fn();
        renderHook(() => useEscapeCascade(onEscape));

        expect(onEscape).not.toHaveBeenCalled();
        pressEscape();
        expect(onEscape).toHaveBeenCalledTimes(1);
    });

    it("does not fire for other keys", () => {
        const onEscape = vi.fn();
        renderHook(() => useEscapeCascade(onEscape));

        act(() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
        });
        expect(onEscape).not.toHaveBeenCalled();
    });

    it("always calls the latest handler without re-subscribing", () => {
        const first = vi.fn();
        const second = vi.fn();
        const { rerender } = renderHook(({ handler }) => useEscapeCascade(handler), {
            initialProps: { handler: first },
        });

        rerender({ handler: second });
        pressEscape();

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledTimes(1);
    });

    it("removes the listener on unmount", () => {
        const onEscape = vi.fn();
        const { unmount } = renderHook(() => useEscapeCascade(onEscape));
        unmount();

        pressEscape();
        expect(onEscape).not.toHaveBeenCalled();
    });
});
