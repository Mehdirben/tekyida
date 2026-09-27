"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `onEscape` when the Escape key is pressed.
 * The handler is kept in a ref, so the listener is registered once.
 */
export function useEscapeCascade(onEscape: () => void) {
    const handlerRef = useRef(onEscape);

    useEffect(() => {
        handlerRef.current = onEscape;
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                handlerRef.current();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);
}
