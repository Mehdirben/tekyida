"use client";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ConvexClientProvider>
            <ThemeProvider>
                <LanguageProvider>{children}</LanguageProvider>
            </ThemeProvider>
        </ConvexClientProvider>
    );
}
