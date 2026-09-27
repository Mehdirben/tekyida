import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type React from "react";
import { useDragReorder } from "./useDragReorder";

describe("useDragReorder", () => {
    it("begins and stops reordering with the given list", () => {
        const onReorder = vi.fn();
        const { result } = renderHook(() => useDragReorder<{ id: string }>(onReorder));

        expect(result.current.isReordering).toBe(false);

        act(() => {
            result.current.beginReorder([{ id: "a" }, { id: "b" }]);
        });
        expect(result.current.isReordering).toBe(true);
        expect(result.current.items.map((i) => i.id)).toEqual(["a", "b"]);

        act(() => {
            result.current.stopReorder();
        });
        expect(result.current.isReordering).toBe(false);
    });

    it("swaps items while dragging past half a row height and reports the new order on drop", () => {
        const onReorder = vi.fn();
        const { result } = renderHook(() => useDragReorder<{ id: string }>(onReorder));

        act(() => {
            result.current.beginReorder([{ id: "a" }, { id: "b" }, { id: "c" }]);
        });

        act(() => {
            result.current.startDrag(new MouseEvent("mousedown", { clientY: 0 }) as unknown as React.MouseEvent, 0, "a");
        });
        expect(result.current.draggedId).toBe("a");
        expect(result.current.draggedIndex).toBe(0);

        act(() => {
            window.dispatchEvent(new MouseEvent("mousemove", { clientY: 60, cancelable: true }));
        });
        expect(result.current.items.map((i) => i.id)).toEqual(["b", "a", "c"]);
        expect(result.current.offsetY).toBe(12);

        act(() => {
            window.dispatchEvent(new MouseEvent("mouseup"));
        });
        expect(onReorder).toHaveBeenCalledWith([{ id: "b" }, { id: "a" }, { id: "c" }]);
        expect(result.current.draggedId).toBeNull();
        expect(result.current.draggedIndex).toBeNull();
        expect(result.current.offsetY).toBe(0);
    });

    it("clamps the target index to the list bounds", () => {
        const onReorder = vi.fn();
        const { result } = renderHook(() => useDragReorder<{ id: string }>(onReorder));

        act(() => {
            result.current.beginReorder([{ id: "a" }, { id: "b" }]);
        });
        act(() => {
            result.current.startDrag(new MouseEvent("mousedown", { clientY: 0 }) as unknown as React.MouseEvent, 0, "a");
        });

        act(() => {
            window.dispatchEvent(new MouseEvent("mousemove", { clientY: 500, cancelable: true }));
        });
        expect(result.current.items.map((i) => i.id)).toEqual(["b", "a"]);

        act(() => {
            window.dispatchEvent(new MouseEvent("mousemove", { clientY: -500, cancelable: true }));
        });
        expect(result.current.items.map((i) => i.id)).toEqual(["a", "b"]);

        act(() => {
            window.dispatchEvent(new MouseEvent("mouseup"));
        });
        expect(onReorder).toHaveBeenCalledWith([{ id: "a" }, { id: "b" }]);
    });

    it("supports touch drag events", () => {
        const onReorder = vi.fn();
        const { result } = renderHook(() => useDragReorder<{ id: string }>(onReorder));

        act(() => {
            result.current.beginReorder([{ id: "a" }, { id: "b" }]);
        });
        const touchStart = { touches: [{ clientY: 0 }] } as unknown as React.TouchEvent;
        act(() => {
            result.current.startDrag(touchStart, 0, "a");
        });
        expect(result.current.draggedId).toBe("a");

        act(() => {
            window.dispatchEvent(new MouseEvent("mouseup"));
        });
        expect(onReorder).toHaveBeenCalledWith([{ id: "a" }, { id: "b" }]);
    });

    it("handles touchmove drag events", () => {
        const onReorder = vi.fn();
        const { result } = renderHook(() => useDragReorder<{ id: string }>(onReorder));

        act(() => {
            result.current.beginReorder([{ id: "a" }, { id: "b" }]);
        });
        const touchStart = { touches: [{ clientY: 0 }] } as unknown as React.TouchEvent;
        act(() => {
            result.current.startDrag(touchStart, 0, "a");
        });

        const touchMove = new Event("touchmove", { cancelable: true }) as Event & {
            touches: { clientY: number }[];
        };
        touchMove.touches = [{ clientY: 60 }];
        act(() => {
            window.dispatchEvent(touchMove);
        });
        expect(result.current.items.map((i) => i.id)).toEqual(["b", "a"]);

        act(() => {
            window.dispatchEvent(new Event("touchend"));
        });
        expect(onReorder).toHaveBeenCalledWith([{ id: "b" }, { id: "a" }]);
    });

    it("ignores preventDefault for non-cancelable move events", () => {
        const onReorder = vi.fn();
        const { result } = renderHook(() => useDragReorder<{ id: string }>(onReorder));

        act(() => {
            result.current.beginReorder([{ id: "a" }, { id: "b" }]);
        });
        act(() => {
            result.current.startDrag(new MouseEvent("mousedown", { clientY: 0 }) as unknown as React.MouseEvent, 0, "a");
        });

        expect(() => {
            act(() => {
                window.dispatchEvent(new MouseEvent("mousemove", { clientY: 1 }));
            });
        }).not.toThrow();

        act(() => {
            window.dispatchEvent(new MouseEvent("mouseup"));
        });
        expect(onReorder).toHaveBeenCalledWith([{ id: "a" }, { id: "b" }]);
    });

    it("does not report a reorder when dropping without crossing a threshold", () => {
        const onReorder = vi.fn();
        const { result } = renderHook(() => useDragReorder<{ id: string }>(onReorder));

        act(() => {
            result.current.beginReorder([{ id: "a" }, { id: "b" }]);
        });
        act(() => {
            result.current.startDrag(new MouseEvent("mousedown", { clientY: 0 }) as unknown as React.MouseEvent, 0, "a");
        });
        act(() => {
            window.dispatchEvent(new MouseEvent("mousemove", { clientY: 10, cancelable: true }));
        });
        expect(result.current.items.map((i) => i.id)).toEqual(["a", "b"]);
        expect(result.current.offsetY).toBe(10);

        act(() => {
            window.dispatchEvent(new MouseEvent("mouseup"));
        });
        expect(onReorder).toHaveBeenCalledWith([{ id: "a" }, { id: "b" }]);
    });
});
