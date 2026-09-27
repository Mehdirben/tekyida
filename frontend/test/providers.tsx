"use client";

import type { ReactNode } from "react";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AmountsVisibilityProvider } from "@/contexts/AmountsVisibilityContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

interface TestProvidersProps {
    children: ReactNode;
    theme?: boolean;
}

/**
 * Wraps children in the app's client providers for component tests.
 * `theme` requires `vi.mock("next/navigation", ...)` (useServerInsertedHTML).
 */
export function TestProviders({ children, theme = false }: TestProvidersProps) {
    const content = (
        <AmountsVisibilityProvider>{children}</AmountsVisibilityProvider>
    );

    return (
        <LanguageProvider>
            {theme ? <ThemeProvider>{content}</ThemeProvider> : content}
        </LanguageProvider>
    );
}
