"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { Loader2 } from "lucide-react";
import BottomNav from "@/components/app/BottomNav";
import { useTranslation } from "@/i18n/LanguageContext";
import AppLock from "@/components/app/AppLock";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useConvexAuth();
    const router = useRouter();
    const { t } = useTranslation();
    const [timedOut, setTimedOut] = useState(false);
    
    // Initialize wasAuthenticated and ref to false (matching server SSR) to prevent hydration mismatches,
    // and safely update them from localStorage in a useEffect after client mount.
    const [wasAuthenticated, setWasAuthenticated] = useState(false);
    const prevAuthenticatedRef = useRef(false);

    useEffect(() => {
        try {
            const isAuthed = localStorage.getItem("tekyida-authed") === "1";
            if (isAuthed) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setWasAuthenticated(true);
                prevAuthenticatedRef.current = true;
            }
        } catch {}
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            prevAuthenticatedRef.current = true;
            const timer = setTimeout(() => {
                setWasAuthenticated(true);
            }, 0);
            try { localStorage.setItem("tekyida-authed", "1"); } catch {}
            return () => clearTimeout(timer);
        } else if (!isLoading && prevAuthenticatedRef.current && navigator.onLine) {
            const timer = setTimeout(() => {
                setWasAuthenticated(false);
            }, 0);
            prevAuthenticatedRef.current = false;
            try { localStorage.removeItem("tekyida-authed"); } catch {}
            return () => clearTimeout(timer);
        }
    }, [isAuthenticated, isLoading]);

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
        <AppLock>
            <div className="mesh-gradient" />
            <div className="relative z-[60] min-h-screen flex flex-col pb-24">
                {children}
                <BottomNav />
            </div>
        </AppLock>
    );
}
