"use client";

import { BookOpen, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/i18n/LanguageContext";

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
            href: "/app/settings",
            label: t("nav.settings"),
            icon: Settings,
            active: pathname === "/app/settings",
        },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
            <div className="mx-4 mb-3 sm:mx-auto sm:max-w-sm">
                <div className="liquid-glass-heavy rounded-2xl px-2 py-2 flex items-center justify-around">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-xl transition-all duration-200 ${tab.active
                                        ? "bg-primary-800/80 dark:bg-primary-500/70 text-white shadow-sm"
                                        : "text-(--text-tertiary) hover:text-(--text-primary)"
                                    }`}
                            >
                                <Icon size={20} strokeWidth={tab.active ? 2.4 : 1.8} />
                                <span className="text-[10px] font-semibold tracking-wide">
                                    {tab.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
