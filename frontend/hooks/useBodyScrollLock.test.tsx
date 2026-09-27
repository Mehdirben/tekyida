import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBodyScrollLock } from "./useBodyScrollLock";

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
