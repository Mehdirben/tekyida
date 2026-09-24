import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderHook, act, render, screen, fireEvent } from "@testing-library/react";
import { useBodyScrollLock } from "./useBodyScrollLock";
import { useKeyboardInset } from "./useKeyboardInset";
import { useLocalAmountsVisibility } from "./useLocalAmountsVisibility";
import {
  AmountsVisibilityProvider,
  useAmountsVisibility,
  getInitialAmountsHidden,
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
    it("returns 0 when visualViewport is undefined", () => {
      const originalVv = window.visualViewport;
      // @ts-expect-error mock missing
      delete window.visualViewport;

      const { result } = renderHook(() => useKeyboardInset());
      expect(result.current).toBe(0);

      window.visualViewport = originalVv;
    });

    it("tracks keyboard inset via visualViewport and handles cleanup", () => {
      let resizeCb: () => void = () => {};
      let scrollCb: () => void = () => {};
      let orientCb: () => void = () => {};

      // @ts-expect-error mock visualViewport
      window.visualViewport = {
        height: 750,
        offsetTop: 0,
        addEventListener: vi.fn((event, cb) => {
          if (event === "resize") resizeCb = cb;
          if (event === "scroll") scrollCb = cb;
        }),
        removeEventListener: vi.fn(),
      };
      window.innerHeight = 800;
      const orientSpy = vi.spyOn(window, "addEventListener").mockImplementation((event, cb) => {
        if (event === "orientationchange") orientCb = cb as () => void;
      });
      const orientRemoveSpy = vi.spyOn(window, "removeEventListener");

      const { result, unmount } = renderHook(() => useKeyboardInset());
      expect(result.current).toBe(0);

      act(() => {
        // @ts-expect-error mock
        window.visualViewport.height = 400;
        resizeCb();
      });
      expect(result.current).toBe(400);

      act(() => {
        scrollCb();
      });
      expect(result.current).toBe(400);

      act(() => {
        orientCb();
      });
      expect(result.current).toBe(400);

      unmount();
      expect(window.visualViewport?.removeEventListener).toHaveBeenCalled();
      orientSpy.mockRestore();
      orientRemoveSpy.mockRestore();
    });
  });

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
});
