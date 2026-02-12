"use client";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/i18n/LanguageContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
    );
}
