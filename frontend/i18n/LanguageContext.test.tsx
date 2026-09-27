import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, renderHook } from "@testing-library/react";
import { LanguageProvider, useTranslation } from "@/i18n/LanguageContext";

function LanguageProbe() {
    const { language, setLanguage, t } = useTranslation();
    return (
        <div>
            <span data-testid="language">{language}</span>
            <span data-testid="title">{t("settings.title")}</span>
            <span data-testid="nav">{t("nav.dashboard")}</span>
            <button onClick={() => setLanguage("en")}>en</button>
            <button onClick={() => setLanguage("fr")}>fr</button>
        </div>
    );
}

describe("LanguageContext", () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.lang = "";
    });

    afterEach(() => {
        localStorage.clear();
    });

    it("defaults to French", () => {
        render(
            <LanguageProvider>
                <LanguageProbe />
            </LanguageProvider>
        );
        expect(screen.getByTestId("language").textContent).toBe("fr");
        expect(screen.getByTestId("title").textContent).toBe("Paramètres");
    });

    it("switches to English, persists, and updates document lang", () => {
        render(
            <LanguageProvider>
                <LanguageProbe />
            </LanguageProvider>
        );

        fireEvent.click(screen.getByText("en"));
        expect(screen.getByTestId("language").textContent).toBe("en");
        expect(screen.getByTestId("title").textContent).toBe("Settings");
        expect(screen.getByTestId("nav").textContent).toBe("Dashboard");
        expect(localStorage.getItem("tekyida-lang")).toBe("en");
        expect(document.documentElement.lang).toBe("en");
    });

    it("restores the saved language on mount", () => {
        localStorage.setItem("tekyida-lang", "en");
        render(
            <LanguageProvider>
                <LanguageProbe />
            </LanguageProvider>
        );
        expect(screen.getByTestId("language").textContent).toBe("en");
        expect(document.documentElement.lang).toBe("en");
    });

    it("ignores invalid saved languages", () => {
        localStorage.setItem("tekyida-lang", "de");
        render(
            <LanguageProvider>
                <LanguageProbe />
            </LanguageProvider>
        );
        expect(screen.getByTestId("language").textContent).toBe("fr");
    });

    it("falls back to the raw key for unknown translations", () => {
        const { t } = renderHook(() => useTranslation(), {
            wrapper: ({ children }: { children: React.ReactNode }) => (
                <LanguageProvider>{children}</LanguageProvider>
            ),
        }).result.current;
        const unknownT = t as unknown as (key: string) => string;
        expect(unknownT("totally.madeUpKey")).toBe("totally.madeUpKey");
    });

    it("throws when useTranslation is used outside the provider", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => renderHook(() => useTranslation())).toThrow(
            "useTranslation must be used within LanguageProvider"
        );
        spy.mockRestore();
    });
});
