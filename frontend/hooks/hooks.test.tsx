import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderHook, act, render, screen, fireEvent } from "@testing-library/react";
import { useBodyScrollLock } from "./useBodyScrollLock";
import { useKeyboardInset } from "./useKeyboardInset";
import { useLocalAmountsVisibility } from "./useLocalAmountsVisibility";
import {
  AmountsVisibilityProvider,
  useAmountsVisibility,
} from "@/contexts/AmountsVisibilityContext";

describe("custom hooks & contexts", () => {
  describe("useBodyScrollLock", () => {
    it("locks and unlocks body scroll when toggled", () => {
      const { rerender } = renderHook(({ locked }) => useBodyScrollLock(locked), {
        initialProps: { locked: false },
      });

      expect(document.body.style.position).not.toBe("fixed");

      rerender({ locked: true });
      expect(document.body.style.position).toBe("fixed");
      expect(document.body.style.overflow).toBe("hidden");

      rerender({ locked: false });
      expect(document.body.style.position).toBe("");
    });
  });

  describe("useKeyboardInset", () => {
    it("tracks keyboard inset via visualViewport", () => {
      // @ts-expect-error mock visualViewport
      window.visualViewport = {
        height: 400,
        offsetTop: 0,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      window.innerHeight = 800;

      const { result } = renderHook(() => useKeyboardInset());
      expect(result.current).toBe(400); // 800 - 400 = 400 > threshold 120
    });
  });

  describe("AmountsVisibilityContext & useLocalAmountsVisibility", () => {
    it("calls default context fallbacks without provider", () => {
      const { result } = renderHook(() => useAmountsVisibility());
      expect(result.current.hidden).toBe(false);
      expect(result.current.mask("test")).toBe("test");
      expect(() => result.current.toggle()).not.toThrow();
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

      render(
        <AmountsVisibilityProvider>
          <TestComponent />
        </AmountsVisibilityProvider>
      );

      expect(screen.getByTestId("hidden").textContent).toBe("false");
      expect(screen.getByTestId("mask").textContent).toBe("100 MAD");

      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByTestId("hidden").textContent).toBe("true");
      expect(screen.getByTestId("mask").textContent).toBe("••••••");

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
});
