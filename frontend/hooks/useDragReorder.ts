"use client";

import { useState, useRef, useEffect, useCallback, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from "react";
import { triggerHaptic } from "@/lib/haptics";

const ITEM_HEIGHT = 48;

export function useDragReorder<T extends { id: string }>(onReorder: (items: T[]) => void) {
    const [isReordering, setIsReordering] = useState(false);
    const [items, setItems] = useState<T[]>([]);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [offsetY, setOffsetY] = useState(0);
    const dragStartYRef = useRef(0);
    const dragCurrentIndexRef = useRef<number | null>(null);

    const beginReorder = useCallback((list: T[]) => {
        setItems(list);
        setIsReordering(true);
    }, []);

    const stopReorder = useCallback(() => {
        setIsReordering(false);
    }, []);

    const startDrag = useCallback((
        e: ReactMouseEvent | ReactTouchEvent,
        index: number,
        id: string
    ) => {
        triggerHaptic("light");
        setDraggedId(id);
        setDraggedIndex(index);
        dragCurrentIndexRef.current = index;
        setOffsetY(0);

        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
        dragStartYRef.current = clientY;
    }, []);

    useEffect(() => {
        if (draggedId !== null && draggedIndex !== null) {
            const handleDragMove = (e: MouseEvent | TouchEvent) => {
                const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
                const deltaY = clientY - dragStartYRef.current;
                setOffsetY(deltaY);

                const newIndex = Math.max(
                    0,
                    Math.min(
                        items.length - 1,
                        Math.round(draggedIndex + deltaY / ITEM_HEIGHT)
                    )
                );

                if (newIndex !== dragCurrentIndexRef.current) {
                    triggerHaptic("light");
                    const updated = [...items];
                    const [movedItem] = updated.splice(draggedIndex, 1);
                    updated.splice(newIndex, 0, movedItem);

                    const indexDiff = newIndex - draggedIndex;
                    dragStartYRef.current += indexDiff * ITEM_HEIGHT;

                    setItems(updated);
                    setDraggedIndex(newIndex);
                    dragCurrentIndexRef.current = newIndex;
                    setOffsetY(clientY - dragStartYRef.current);
                }
            };

            const handleDragEnd = () => {
                triggerHaptic("success");
                setDraggedId(null);
                setDraggedIndex(null);
                dragCurrentIndexRef.current = null;
                setOffsetY(0);

                onReorder(items);
            };

            const onMove = (e: MouseEvent | TouchEvent) => {
                if (e.cancelable) e.preventDefault();
                handleDragMove(e);
            };
            const onEnd = () => {
                handleDragEnd();
            };

            window.addEventListener("mousemove", onMove, { passive: false });
            window.addEventListener("mouseup", onEnd);
            window.addEventListener("touchmove", onMove, { passive: false });
            window.addEventListener("touchend", onEnd);

            return () => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onEnd);
                window.removeEventListener("touchmove", onMove);
                window.removeEventListener("touchend", onEnd);
            };
        }
    }, [draggedId, draggedIndex, items, onReorder]);

    return {
        isReordering,
        items,
        draggedId,
        draggedIndex,
        offsetY,
        beginReorder,
        stopReorder,
        startDrag,
    };
}
