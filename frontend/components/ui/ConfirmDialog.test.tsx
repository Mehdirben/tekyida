import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render as rtlRender, screen, fireEvent } from "@testing-library/react";
import ConfirmDialog from "./ConfirmDialog";
import { TestProviders } from "@/test/providers";

beforeEach(() => {
    localStorage.setItem("tekyida-lang", "en");
});

afterEach(() => {
    localStorage.clear();
});


const render = (ui: React.ReactElement, options = {}) =>
    rtlRender(ui, { wrapper: TestProviders, ...options });

describe("ConfirmDialog", () => {
    it("renders the danger delete dialog by default", () => {
        render(
            <ConfirmDialog
                isOpen
                title="Delete Notebook"
                description="This cannot be undone."
                itemName="Personal"
                onCancel={() => {}}
                onConfirm={() => {}}
            />
        );

        expect(screen.getByText("Delete Notebook")).toBeDefined();
        expect(screen.getByText("This cannot be undone.")).toBeDefined();
        expect(screen.getByText("Personal")).toBeDefined();
        expect(screen.getByText("Delete").className).toContain("text-danger-500");
        const iconWrap = screen.getByText("Delete Notebook").previousElementSibling as Element;
        expect(iconWrap.className).toContain("bg-danger-500/10");
    });

    it("supports a warning tint, custom icon and confirm label", () => {
        const Icon = () => <svg data-testid="custom-icon" />;
        render(
            <ConfirmDialog
                isOpen
                title="Archive Notebook"
                description="It will be hidden."
                onCancel={() => {}}
                onConfirm={() => {}}
                confirmLabel="Archive"
                icon={Icon as never}
                tint="warning"
            />
        );

        expect(screen.getByText("Archive")).toBeDefined();
        expect(screen.getByTestId("custom-icon")).not.toBeNull();
        expect(screen.getByText("Archive").className).toContain("text-warning-500");
    });

    it("cancels with a light haptic via the cancel button and backdrop", () => {
        const onCancel = vi.fn();
        const onConfirm = vi.fn();
        render(
            <ConfirmDialog
                isOpen
                title="Delete Notebook"
                description="This cannot be undone."
                onCancel={onCancel}
                onConfirm={onConfirm}
            />
        );

        fireEvent.click(screen.getByText("Cancel"));
        expect(onCancel).toHaveBeenCalledTimes(1);

        fireEvent.click(document.querySelector(".backdrop-blur-sm") as Element);
        expect(onCancel).toHaveBeenCalledTimes(2);
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it("confirms via the confirm button", () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(
            <ConfirmDialog
                isOpen
                title="Delete Notebook"
                description="This cannot be undone."
                onCancel={onCancel}
                onConfirm={onConfirm}
            />
        );

        fireEvent.click(screen.getByText("Delete"));
        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onCancel).not.toHaveBeenCalled();
    });

    it("renders nothing when closed", () => {
        const { container } = render(
            <ConfirmDialog
                isOpen={false}
                title="Delete Notebook"
                description="This cannot be undone."
                onCancel={() => {}}
                onConfirm={() => {}}
            />
        );
        expect(container.innerHTML).toBe("");
    });
});
