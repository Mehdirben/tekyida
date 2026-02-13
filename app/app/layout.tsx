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

    useEffect(() => {
        // Track authentication state in sessionStorage for offline resilience
        if (isAuthenticated) {
            setWasAuthenticated(true);
            try { sessionStorage.setItem("tekyida-authed", "1"); } catch {}
        }
    }, [isAuthenticated]);

    useEffect(() => {
        // Check if previously authenticated (for offline case)
        try {
            if (sessionStorage.getItem("tekyida-authed") === "1") {
                setWasAuthenticated(true);
            }
        } catch {}
    }, []);

    useEffect(() => {
        // Only redirect if definitely not authenticated AND online
        if (!isLoading && !isAuthenticated && !wasAuthenticated && navigator.onLine) {
            router.push("/login");
        }
    }, [isLoading, isAuthenticated, wasAuthenticated, router]);

    // Show loading only on first load when online and not previously authenticated
    if ((isLoading || !isAuthenticated) && !wasAuthenticated) {
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
