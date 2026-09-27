import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, act, fireEvent, renderHook } from "@testing-library/react";
import { ThemeProvider, useTheme, getSystemTheme } from "@/contexts/ThemeContext";

vi.mock("next/navigation", async () => {
    const m = await import("@/test/mocks");
    return m.nextNavigationMock();
});

let matchesDark = false;
const changeListeners = new Set<() => void>();

function ThemeProbe() {
    const { theme, resolvedTheme, setTheme } = useTheme();
    return (
        <div>
            <span data-testid="theme">{theme}</span>
            <span data-testid="resolved">{resolvedTheme}</span>
            <button onClick={() => setTheme("dark")}>dark</button>
            <button onClick={() => setTheme("light")}>light</button>
            <button onClick={() => setTheme("system")}>system</button>
        </div>
    );
}

function renderThemeProvider() {
    return render(
        <ThemeProvider>
            <ThemeProbe />
        </ThemeProvider>
    );
}

describe("ThemeContext", () => {
    beforeEach(() => {
        matchesDark = false;
        changeListeners.clear();
        localStorage.clear();
        document.documentElement.className = "";
        vi.stubGlobal(
            "matchMedia",
            vi.fn().mockImplementation((query: string) => ({
                matches: query.includes("dark") ? matchesDark : false,
                addEventListener: (_: string, cb: () => void) => changeListeners.add(cb),
                removeEventListener: (_: string, cb: () => void) => changeListeners.delete(cb),
            }))
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("defaults to system and resolves light when the OS prefers light", () => {
        renderThemeProvider();
        expect(screen.getByTestId("theme").textContent).toBe("system");
        expect(screen.getByTestId("resolved").textContent).toBe("light");
        expect(document.documentElement.classList.contains("light")).toBe(true);
    });

    it("resolves dark when the OS prefers dark", () => {
        matchesDark = true;
        renderThemeProvider();
        expect(screen.getByTestId("resolved").textContent).toBe("dark");
        expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("applies an explicit saved theme from localStorage on mount", () => {
        localStorage.setItem("tekyida-theme", "dark");
        renderThemeProvider();
        expect(screen.getByTestId("theme").textContent).toBe("dark");
        expect(screen.getByTestId("resolved").textContent).toBe("dark");
    });

    it("setTheme persists and applies the theme", () => {
        renderThemeProvider();
        fireEvent.click(screen.getByText("dark"));
        expect(screen.getByTestId("theme").textContent).toBe("dark");
        expect(screen.getByTestId("resolved").textContent).toBe("dark");
        expect(localStorage.getItem("tekyida-theme")).toBe("dark");

        fireEvent.click(screen.getByText("light"));
        expect(document.documentElement.classList.contains("light")).toBe(true);
        expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("reacts to system theme changes while in system mode", () => {
        renderThemeProvider();
        expect(screen.getByTestId("resolved").textContent).toBe("light");

        act(() => {
            matchesDark = true;
            changeListeners.forEach((cb) => cb());
        });
        expect(screen.getByTestId("resolved").textContent).toBe("dark");

        // Explicit theme ignores system changes
        fireEvent.click(screen.getByText("light"));
        act(() => {
            matchesDark = false;
            changeListeners.forEach((cb) => cb());
        });
        expect(screen.getByTestId("resolved").textContent).toBe("light");
    });

    it("resolves dark during SSR", () => {
        const spy = vi.spyOn(globalThis, "window", "get").mockReturnValue(undefined as never);
        expect(getSystemTheme()).toBe("dark");
        spy.mockRestore();
    });

    it("throws when useTheme is used outside the provider", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => renderHook(() => useTheme())).toThrow(
            "useTheme must be used within ThemeProvider"
        );
        spy.mockRestore();
    });
});
