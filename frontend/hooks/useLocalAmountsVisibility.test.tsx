import { describe, it, expect } from "vitest";
import { renderHook, act, render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { useLocalAmountsVisibility } from "./useLocalAmountsVisibility";
import {
    AmountsVisibilityProvider,
    useAmountsVisibility,
    getInitialAmountsHidden,
} from "@/contexts/AmountsVisibilityContext";

describe("AmountsVisibilityContext & useLocalAmountsVisibility", () => {
    it("calls default context fallbacks without provider", () => {
        const { result } = renderHook(() => useAmountsVisibility());
        expect(result.current.hidden).toBe(false);
        expect(result.current.mask("test")).toBe("test");
        expect(() => result.current.toggle()).not.toThrow();
    });

    it("handles SSR fallback when isClient is false", () => {
        expect(getInitialAmountsHidden(false)).toBe(true);
    });

    it("respects remember behavior from localStorage", () => {
        localStorage.setItem("tekyida-amounts-load-behavior", "remember");
        localStorage.setItem("tekyida-hide-amounts", "false");

        const TestComponent = () => {
            const { hidden, toggle, mask } = useAmountsVisibility();
            return (
                <div>
                    <span data-testid="hidden">{String(hidden)}</span>
                    <span data-testid="mask">{mask("100 MAD")}</span>
                    <button onClick={toggle}>Toggle</button>
                </div>
            );
        };

        const { unmount } = render(
            <AmountsVisibilityProvider>
                <TestComponent />
            </AmountsVisibilityProvider>
        );

        expect(screen.getByTestId("hidden").textContent).toBe("false");
        expect(screen.getByTestId("mask").textContent).toBe("100 MAD");

        fireEvent.click(screen.getByRole("button"));
        expect(screen.getByTestId("hidden").textContent).toBe("true");
        expect(screen.getByTestId("mask").textContent).toBe("••••••");

        unmount();

        localStorage.setItem("tekyida-amounts-load-behavior", "remember");
        localStorage.setItem("tekyida-hide-amounts", "true");
        const { unmount: unmount2 } = render(
            <AmountsVisibilityProvider>
                <TestComponent />
            </AmountsVisibilityProvider>
        );
        expect(screen.getByTestId("hidden").textContent).toBe("true");
        unmount2();
        localStorage.clear();
    });

    it("respects default always-hide when behavior is not remember", () => {
        localStorage.setItem("tekyida-amounts-load-behavior", "always-hide");

        const TestComponent = () => {
            const { hidden } = useAmountsVisibility();
            return <span data-testid="hidden">{String(hidden)}</span>;
        };

        render(
            <AmountsVisibilityProvider>
                <TestComponent />
            </AmountsVisibilityProvider>
        );

        expect(screen.getByTestId("hidden").textContent).toBe("true");
        localStorage.clear();
    });

    it("toggles and masks amounts correctly in useLocalAmountsVisibility", () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <AmountsVisibilityProvider>{children}</AmountsVisibilityProvider>
        );

        const { result } = renderHook(() => useLocalAmountsVisibility(), { wrapper });

        expect(result.current.localHidden).toBe(true);
        expect(result.current.localMask("1,500.00 MAD")).toBe("••••••");

        act(() => {
            result.current.toggleLocal();
        });

        expect(result.current.localHidden).toBe(false);
        expect(result.current.localMask("1,500.00 MAD")).toBe("1,500.00 MAD");
    });
});
