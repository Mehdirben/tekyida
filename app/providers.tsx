"use client";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { SyncProvider } from "@/contexts/SyncContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ConvexClientProvider>
            <ThemeProvider>
                <LanguageProvider>
                    <SyncProvider>{children}</SyncProvider>
                </LanguageProvider>
            </ThemeProvider>
        </ConvexClientProvider>
    );
}
