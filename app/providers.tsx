"use client";

import { useEffect } from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { SyncProvider } from "@/contexts/SyncContext";

export function Providers({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const handleAnimationEnd = (e: AnimationEvent) => {
            const target = e.target as HTMLElement;
            if (!target || !target.classList) return;

            // When entry animations finish, remove their class to prevent
            // the browser from re-triggering them during parent layout/style recalcs.
            if (e.animationName === "slide-up") {
                target.classList.remove("animate-slide-up");
                // Remove any delay classes as well
                const delayClasses = Array.from(target.classList).filter((c) =>
                    c.startsWith("delay-")
                );
                delayClasses.forEach((c) => target.classList.remove(c));
            } else if (e.animationName === "fade-in") {
                target.classList.remove("animate-fade-in");
            } else if (e.animationName === "scale-in") {
                target.classList.remove("animate-scale-in");
            }
        };

        document.addEventListener("animationend", handleAnimationEnd);
        return () => {
            document.removeEventListener("animationend", handleAnimationEnd);
        };
    }, []);

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
