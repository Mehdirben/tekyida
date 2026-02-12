"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    type ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
    theme: Theme;
    resolvedTheme: "light" | "dark";
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): "light" | "dark" {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("system");
    const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

    const applyTheme = useCallback((t: Theme) => {
        const resolved = t === "system" ? getSystemTheme() : t;
        setResolvedTheme(resolved);
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(resolved);
    }, []);

    const setTheme = useCallback(
        (t: Theme) => {
            setThemeState(t);
            localStorage.setItem("tekyida-theme", t);
            applyTheme(t);
        },
        [applyTheme]
    );

    useEffect(() => {
        const saved = localStorage.getItem("tekyida-theme") as Theme | null;
        const initial = saved || "system";
        setThemeState(initial);
        applyTheme(initial);

        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => {
            if ((localStorage.getItem("tekyida-theme") || "system") === "system") {
                applyTheme("system");
            }
        };
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [applyTheme]);

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
}
