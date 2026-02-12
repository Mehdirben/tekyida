"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { Loader2 } from "lucide-react";
import BottomNav from "@/components/app/BottomNav";
import { useTranslation } from "@/i18n/LanguageContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useConvexAuth();
    const router = useRouter();
    const { t } = useTranslation();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isLoading, isAuthenticated, router]);

    // Loading / unauthenticated state
    if (isLoading || !isAuthenticated) {
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
