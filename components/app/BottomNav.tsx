"use client";

import { BookOpen, Compass, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/i18n/LanguageContext";
import { triggerHaptic } from "@/lib/haptics";

export default function BottomNav() {
    const { t } = useTranslation();
    const pathname = usePathname();

    const tabs = [
        {
            href: "/app",
            label: t("nav.dashboard"),
            icon: BookOpen,
            active: pathname === "/app",
        },
        {
            href: "/app/experiences",
            label: t("nav.experiences"),
            icon: Compass,
            active: pathname === "/app/experiences",
        },
        {
            href: "/app/settings",
            label: t("nav.settings"),
            icon: Settings,
            active: pathname === "/app/settings",
        },
    ];

    return (
        <nav className="app-bottom-nav app-safe-bottom-nav fixed bottom-0 left-0 right-0 z-70">
            <div className="flex justify-center px-4">
                <div
                    className="inline-flex items-center gap-2 p-1.5 rounded-full"
                    style={{
                        background: "var(--glass-bg-heavy)",
                        backdropFilter: "blur(48px) saturate(2.4)",
                        WebkitBackdropFilter: "blur(48px) saturate(2.4)",
                        border: "1px solid var(--glass-border)",
                        boxShadow:
                            "0 8px 40px var(--glass-shadow), 0 2px 6px var(--glass-shadow), inset 0 1px 0 var(--glass-highlight)",
                        transform: "translate3d(0, 0, 0)",
                        backfaceVisibility: "hidden",
                    }}
                >
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                onClick={() => triggerHaptic(tab.active ? "light" : "selection")}
                                className="relative flex items-center gap-2 rounded-full transition-all duration-300 ease-out"
                                style={
                                    tab.active
                                        ? {
                                            padding: "0.5rem 1.25rem",
                                            background:
                                                "linear-gradient(135deg, var(--color-primary-600), var(--color-primary-800))",
                                            boxShadow:
                                                "0 4px 16px rgba(90, 107, 170, 0.4), inset 0 1px 0 rgba(255,255,255,0.12)",
                                            color: "#fff",
                                        }
                                        : {
                                            padding: "0.5rem 1rem",
                                            color: "var(--text-tertiary)",
                                        }
                                }
                            >
                                <Icon
                                    size={20}
                                    strokeWidth={tab.active ? 2.2 : 1.8}
                                    className="transition-all duration-300"
                                />
                                {tab.active && (
                                    <span className="text-xs font-semibold tracking-wide whitespace-nowrap">
                                        {tab.label}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
