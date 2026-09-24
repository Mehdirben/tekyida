"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface AmountsVisibilityContextType {
    hidden: boolean;
    toggle: () => void;
    mask: (value: string) => string;
}

const AmountsVisibilityContext = createContext<AmountsVisibilityContextType>({
    hidden: false,
    toggle: () => {},
    mask: (v) => v,
});

export function AmountsVisibilityProvider({ children }: { children: ReactNode }) {
    const [hidden, setHidden] = useState(() => {
        if (typeof window !== "undefined") {
            const behavior = localStorage.getItem("tekyida-amounts-load-behavior");
            if (behavior === "remember") {
                return localStorage.getItem("tekyida-hide-amounts") === "true";
            }
        }
        return true;
    });

    const toggle = () =>
        setHidden((prev) => {
            const next = !prev;
            localStorage.setItem("tekyida-hide-amounts", String(next));
            return next;
        });
    const mask = (value: string) => (hidden ? "••••••" : value);

    return (
        <AmountsVisibilityContext.Provider value={{ hidden, toggle, mask }}>
            {children}
        </AmountsVisibilityContext.Provider>
    );
}

export function useAmountsVisibility() {
    return useContext(AmountsVisibilityContext);
}
