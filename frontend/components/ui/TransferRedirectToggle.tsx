"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, BookOpen } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { triggerHaptic } from "@/lib/haptics";

type TransferRedirectBehavior = "redirect" | "stay";

export default function TransferRedirectToggle() {
    const { t } = useTranslation();
    const [behavior, setBehaviorState] = useState<TransferRedirectBehavior>("stay");

    useEffect(() => {
        const stored = localStorage.getItem("tekyida-transfer-redirect");
        if (stored === "redirect") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setBehaviorState("redirect");
        }
    }, []);

    const setBehavior = (value: TransferRedirectBehavior) => {
        setBehaviorState(value);
        localStorage.setItem("tekyida-transfer-redirect", value);
        triggerHaptic(behavior === value ? "light" : "selection");
    };

    const options = [
        { value: "stay" as const, icon: ArrowRightLeft, label: t("settings.transferStay") },
        { value: "redirect" as const, icon: BookOpen, label: t("settings.transferRedirect") },
    ];

    return (
        <div className="flex items-center liquid-glass rounded-full p-1 shrink-0">
            {options.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    onClick={() => setBehavior(value)}
                    aria-label={label}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1 ${behavior === value
                            ? "bg-primary-800/80 dark:bg-primary-500/70 text-white shadow-sm backdrop-blur-sm"
                            : "text-(--text-tertiary) hover:text-(--text-primary)"
                        }`}
                >
                    <Icon size={12} strokeWidth={2.2} className="shrink-0" />
                    <span className="whitespace-nowrap">{label}</span>
                </button>
            ))}
        </div>
    );
}
