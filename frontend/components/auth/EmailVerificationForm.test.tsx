import { describe, it, expect, vi } from "vitest";
import { render as rtlRender, screen, fireEvent } from "@testing-library/react";
import EmailVerificationForm from "./EmailVerificationForm";
import { TestProviders } from "@/test/providers";

const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: TestProviders });

describe("EmailVerificationForm", () => {
    it("renders the email and code input", () => {
        render(
            <EmailVerificationForm
                email="a@b.c"
                code=""
                loading={false}
                onCodeChange={() => {}}
                onSubmit={() => {}}
                onResendCode={() => {}}
            />
        );
        expect(screen.getByText("a@b.c")).toBeDefined();
        const input = screen.getByPlaceholderText("000000") as HTMLInputElement;
        expect(input.disabled).toBe(false);
    });

    it("strips non-digits and caps the code at 6 characters", () => {
        const onCodeChange = vi.fn();
        render(
            <EmailVerificationForm
                email="a@b.c"
                code=""
                loading={false}
                onCodeChange={onCodeChange}
                onSubmit={() => {}}
                onResendCode={() => {}}
            />
        );

        const input = screen.getByPlaceholderText("000000");
        fireEvent.change(input, { target: { value: "12ab34cd56" } });
        expect(onCodeChange).toHaveBeenLastCalledWith("123456");
    });

    it("disables inputs while loading and fires submit/resend", () => {
        const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
        const onResendCode = vi.fn();
        render(
            <EmailVerificationForm
                email="a@b.c"
                code="123456"
                loading
                onCodeChange={() => {}}
                onSubmit={onSubmit}
                onResendCode={onResendCode}
            />
        );

        const form = document.querySelector("form") as HTMLFormElement;
        fireEvent.submit(form);
        expect(onSubmit).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByText("Renvoyer le code"));
        expect(onResendCode).not.toHaveBeenCalled();
    });

    it("sends the code again when not loading", () => {
        const onResendCode = vi.fn();
        render(
            <EmailVerificationForm
                email="a@b.c"
                code=""
                loading={false}
                onCodeChange={() => {}}
                onSubmit={() => {}}
                onResendCode={onResendCode}
            />
        );
        fireEvent.click(screen.getByText("Renvoyer le code"));
        expect(onResendCode).toHaveBeenCalledTimes(1);
    });
});
