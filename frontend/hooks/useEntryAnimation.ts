"use client";

import { useState, useEffect } from "react";

/**
 * Returns `true` for the first `durationMs` after mount, then `false`.
 * Used to drive page entry animations.
 */
export function useEntryAnimation(durationMs = 900): boolean {
    const [animateIn, setAnimateIn] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimateIn(false);
        }, durationMs);
        return () => clearTimeout(timer);
    }, [durationMs]);

    return animateIn;
}
