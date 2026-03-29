"use client";

import { useEffect, useState } from "react";

export function useKeyboardInset() {
    const [keyboardInset, setKeyboardInset] = useState(0);

    useEffect(() => {
        if (typeof window === "undefined" || !window.visualViewport) return;

        const vv = window.visualViewport;

        const updateKeyboardInset = () => {
            const rawInset = window.innerHeight - vv.height - vv.offsetTop;
            setKeyboardInset(rawInset > 0 ? Math.round(rawInset) : 0);
        };

        updateKeyboardInset();

        vv.addEventListener("resize", updateKeyboardInset);
        vv.addEventListener("scroll", updateKeyboardInset);
        window.addEventListener("orientationchange", updateKeyboardInset);

        return () => {
            vv.removeEventListener("resize", updateKeyboardInset);
            vv.removeEventListener("scroll", updateKeyboardInset);
            window.removeEventListener("orientationchange", updateKeyboardInset);
        };
    }, []);

    return keyboardInset;
}
