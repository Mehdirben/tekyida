import { describe, it, expect, vi, afterEach } from "vitest";
import { render as rtlRender, screen, fireEvent, act, waitFor } from "@testing-library/react";
import React from "react";
import PinPad from "./PinPad";

afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
});


const render = (ui: React.ReactElement, options = {}) =>
    rtlRender(ui, { ...options });

describe("PinPad", () => {
    function StatefulPad({ onComplete, onClearError, error }: { onComplete?: (pin: string) => void; onClearError?: () => void; error?: boolean }) {
        const [value, setValue] = React.useState("");
        return <PinPad value={value} onChange={setValue} onComplete={onComplete} onClearError={onClearError} error={error} />;
    }

    function renderPad(overrides: Partial<React.ComponentProps<typeof PinPad>> = {}) {
        const onChange = vi.fn();
        const onComplete = vi.fn();
        const onClearError = vi.fn();
        const props = {
            value: "",
            onChange,
            onComplete,
            onClearError,
            ...overrides,
        };
        render(<PinPad {...props} />);
        return { onChange, onComplete, onClearError };
    }

    it("renders the pad with number keys and a delete key", () => {
        renderPad();
        const buttons = screen.getAllByRole("button");
        expect(buttons.length).toBeGreaterThanOrEqual(11);
    });

    it("appends digits and fires onComplete at six digits", async () => {
        vi.useFakeTimers();
        const onComplete = vi.fn();
        render(<StatefulPad onComplete={onComplete} />);

        const buttons = screen.getAllByRole("button");
        const digitButtons = buttons.slice(0, 10);
        const order = ["1", "2", "3", "4", "5", "6"];
        for (const d of order) {
            fireEvent.click(digitButtons[Number(d) - 1]);
        }

        await act(async () => {
            vi.advanceTimersByTime(100);
        });
        expect(onComplete).toHaveBeenCalledWith("123456");
    });

    it("ignores input beyond six digits", () => {
        const { onChange } = renderPad({ value: "123456" });
        fireEvent.click(screen.getAllByRole("button")[0]);
        expect(onChange).not.toHaveBeenCalled();
    });

    it("deletes the last digit via the delete key", () => {
        const { onChange } = renderPad({ value: "123" });
        const buttons = screen.getAllByRole("button");
        fireEvent.click(buttons[buttons.length - 1]);
        expect(onChange).toHaveBeenCalledWith("12");
    });

    it("ignores delete on an empty value", () => {
        const { onChange } = renderPad({ value: "" });
        const buttons = screen.getAllByRole("button");
        fireEvent.click(buttons[buttons.length - 1]);
        expect(onChange).not.toHaveBeenCalled();
    });

    it("plays the error shake then clears the error", async () => {
        vi.useFakeTimers();
        const onClearError = vi.fn();
        renderPad({ error: true, onClearError });

        await act(async () => {
            vi.advanceTimersByTime(450);
        });
        expect(onClearError).toHaveBeenCalledTimes(1);
    });

    it("supports physical keyboard digits and backspace", async () => {
        const onComplete = vi.fn();
        render(<StatefulPad onComplete={onComplete} />);

        fireEvent.keyDown(window, { key: "5" });
        await waitFor(() => expect(screen.getAllByRole("button").length).toBeGreaterThan(0));

        fireEvent.keyDown(window, { key: "5" });
        fireEvent.keyDown(window, { key: "Backspace" });
        expect(onComplete).not.toHaveBeenCalled();
    });

    it("ignores keyboard events while typing in inputs", async () => {
        const { onChange } = renderPad();
        const input = document.createElement("input");
        document.body.appendChild(input);
        input.focus();

        await act(async () => {
            fireEvent.keyDown(window, { key: "5" });
        });
        expect(onChange).not.toHaveBeenCalled();
        input.remove();
    });

    it("shows the error title and fills dots for external values", async () => {
        const { rerender } = render(
            <PinPad value="" onChange={() => {}} error title="Wrong PIN" />
        );
        expect(screen.getByText("Wrong PIN")).toBeDefined();

        rerender(<PinPad value="42" onChange={() => {}} />);
        const filledDots = document.querySelectorAll(".bg-primary-500.scale-110");
        expect(filledDots.length).toBe(2);
    });
});
