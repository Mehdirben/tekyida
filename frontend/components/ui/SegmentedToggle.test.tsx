import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SegmentedToggle from "./SegmentedToggle";

afterEach(() => {
    localStorage.clear();
});

describe("SegmentedToggle", () => {
    it("renders options and applies the default value", () => {
        render(
            <SegmentedToggle<"a" | "b">
                storageKey="seg-test-1"
                defaultValue="a"
                options={[
                    { value: "a", label: "Alpha" },
                    { value: "b", label: "Beta" },
                ]}
            />
        );

        const alpha = screen.getByRole("button", { name: "Alpha" });
        const beta = screen.getByRole("button", { name: "Beta" });
        expect(alpha.className).toContain("bg-primary-800/80");
        expect(beta.className).toContain("text-(--text-tertiary)");
    });

    it("persists the selection in localStorage and switches active styles", () => {
        render(
            <SegmentedToggle<"a" | "b">
                storageKey="seg-test-2"
                defaultValue="a"
                options={[
                    { value: "a", label: "Alpha" },
                    { value: "b", label: "Beta" },
                ]}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Beta" }));
        expect(localStorage.getItem("seg-test-2")).toBe("b");
        expect(screen.getByRole("button", { name: "Beta" }).className).toContain("bg-primary-800/80");
    });

    it("restores a persisted selection on mount", () => {
        localStorage.setItem("seg-test-3", "b");
        render(
            <SegmentedToggle<"a" | "b">
                storageKey="seg-test-3"
                defaultValue="a"
                options={[
                    { value: "a", label: "Alpha" },
                    { value: "b", label: "Beta" },
                ]}
            />
        );
        expect(screen.getByRole("button", { name: "Beta" }).className).toContain("bg-primary-800/80");
    });

    it("supports controlled mode with onChange", () => {
        const onChange = vi.fn();
        render(
            <SegmentedToggle<"x" | "y">
                value="x"
                onChange={onChange}
                options={[
                    { value: "x", label: "X", ariaLabel: "ex" },
                    { value: "y", label: "Y", ariaLabel: "why" },
                ]}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "why" }));
        expect(onChange).toHaveBeenCalledWith("y");
        expect(screen.getByRole("button", { name: "ex" }).className).toContain("bg-primary-800/80");
    });

    it("renders icon-only and responsive label modes", () => {
        const Icon = () => <svg data-testid="icon" />;
        render(
            <SegmentedToggle<"i" | "s">
                value="i"
                onChange={() => {}}
                options={[
                    { value: "i", icon: Icon, label: "IconOnly", labelMode: "never" },
                    { value: "s", emoji: "🌍", label: "Globe", labelMode: "sm" },
                ]}
            />
        );

        const iconBtn = screen.getByRole("button", { name: "IconOnly" });
        expect(iconBtn.querySelector("svg")).not.toBeNull();
        expect(screen.queryByText("IconOnly")).toBeNull();

        const globeBtn = screen.getByRole("button", { name: "Globe" });
        expect(globeBtn.textContent).toContain("🌍");
        expect(globeBtn.querySelector("span.hidden") !== null).toBe(true);
    });
});
