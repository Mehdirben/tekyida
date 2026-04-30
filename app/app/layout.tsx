"use client";

import { useEffect, useRef, useState } from "react";
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
    const prevAuthenticatedRef = useRef(false);

    useEffect(() => {
        if (isAuthenticated) {
            prevAuthenticatedRef.current = true;
            setWasAuthenticated(true);
            try { localStorage.setItem("tekyida-authed", "1"); } catch {}
        } else if (prevAuthenticatedRef.current && navigator.onLine) {
            setWasAuthenticated(false);
            prevAuthenticatedRef.current = false;
            try { localStorage.removeItem("tekyida-authed"); } catch {}
        }
    }, [isAuthenticated]);

    useEffect(() => {
        try {
            if (localStorage.getItem("tekyida-authed") === "1") {
                setWasAuthenticated(true);
                prevAuthenticatedRef.current = true;
            }
        } catch {}
    }, []);

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
        if (!isLoading && !isAuthenticated && !wasAuthenticated && navigator.onLine) {
            router.push("/login");
        }
    }, [isLoading, isAuthenticated, wasAuthenticated, router]);

    useEffect(() => {
        if (timedOut && !wasAuthenticated && !isAuthenticated) {
            router.push("/login");
        }
    }, [timedOut, wasAuthenticated, isAuthenticated, router]);

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
