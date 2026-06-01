"use client";

import { useEffect, useState } from "react";
import { EyeOff, History } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { triggerHaptic } from "@/lib/haptics";

type AmountsLoadBehavior = "hidden" | "remember";

export default function AmountsLoadBehaviorToggle() {
    const { t } = useTranslation();
    const [behavior, setBehaviorState] = useState<AmountsLoadBehavior>("hidden");

    useEffect(() => {
        const stored = localStorage.getItem("tekyida-amounts-load-behavior");
        if (stored === "remember") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setBehaviorState("remember");
        }
    }, []);

    const setBehavior = (value: AmountsLoadBehavior) => {
        setBehaviorState(value);
        localStorage.setItem("tekyida-amounts-load-behavior", value);
        triggerHaptic(behavior === value ? "light" : "selection");
    };

    const options = [
        { value: "hidden" as const, icon: EyeOff, label: t("settings.alwaysHidden") },
        { value: "remember" as const, icon: History, label: t("settings.rememberLast") },
    ];

    return (
        <div className="flex items-center liquid-glass rounded-full p-0.5">
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
                    <Icon size={12} strokeWidth={2.2} />
                    <span>{label}</span>
                </button>
            ))}
        </div>
    );
}
