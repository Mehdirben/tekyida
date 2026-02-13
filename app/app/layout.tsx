"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { Loader2 } from "lucide-react";
import BottomNav from "@/components/app/BottomNav";
import { useTranslation } from "@/i18n/LanguageContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useConvexAuth();
    const router = useRouter();
    const { t } = useTranslation();
    const [wasAuthenticated, setWasAuthenticated] = useState(false);
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        // Track authentication state in localStorage for offline resilience
        // (survives browser close, unlike sessionStorage)
        if (isAuthenticated) {
            setWasAuthenticated(true);
            try { localStorage.setItem("tekyida-authed", "1"); } catch {}
        }
    }, [isAuthenticated]);

    useEffect(() => {
        // Check if previously authenticated (for offline case)
        try {
            if (localStorage.getItem("tekyida-authed") === "1") {
                setWasAuthenticated(true);
            }
        } catch {}
    }, []);

    // If auth is still loading after 3s and we're offline, stop waiting
    useEffect(() => {
        if (!isLoading || wasAuthenticated) return;
        const timer = setTimeout(() => {
            if (!navigator.onLine) {
                setTimedOut(true);
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [isLoading, wasAuthenticated]);

    useEffect(() => {
        // Only redirect if definitely not authenticated AND online
        if (!isLoading && !isAuthenticated && !wasAuthenticated && navigator.onLine) {
            router.push("/login");
        }
    }, [isLoading, isAuthenticated, wasAuthenticated, router]);

    // If offline and timed out with no prior auth, redirect to login
    useEffect(() => {
        if (timedOut && !wasAuthenticated && !isAuthenticated) {
            router.push("/login");
        }
    }, [timedOut, wasAuthenticated, isAuthenticated, router]);

    // Show loading only when still determining auth and not previously authenticated
    if ((isLoading || !isAuthenticated) && !wasAuthenticated && !timedOut) {
        return (
            <>
                <div className="mesh-gradient" />
                <div className="relative z-10 min-h-screen flex items-center justify-center">
                    <div className="liquid-glass-card p-8 flex flex-col items-center gap-4 animate-scale-in">
                        <Loader2 size={28} className="animate-spin text-primary-500" />
                        <p className="text-sm text-(--text-secondary)">{t("dashboard.loading")}</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="mesh-gradient" />
            <div className="relative z-[60] min-h-screen flex flex-col pb-24">
                {children}
            </div>
            <BottomNav />
        </>
    );
}
