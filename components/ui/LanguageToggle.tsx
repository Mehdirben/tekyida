"use client";

import { useTranslation } from "@/i18n/LanguageContext";
import { triggerHaptic } from "@/lib/haptics";

export default function LanguageToggle() {
    const { language, setLanguage } = useTranslation();

    const options = [
        { value: "fr" as const, label: "FR", flag: "🇫🇷" },
        { value: "en" as const, label: "EN", flag: "🇬🇧" },
    ];

    return (
        <div className="flex items-center liquid-glass rounded-full p-1 shrink-0">
            {options.map(({ value, label, flag }) => (
                <button
                    key={value}
                    onClick={() => {
                        setLanguage(value);
                        triggerHaptic(language === value ? "light" : "selection");
                    }}
                    aria-label={`Switch to ${label}`}
                    className={`px-2 py-1 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1 ${language === value
                            ? "bg-primary-800/80 dark:bg-primary-500/70 text-white shadow-sm backdrop-blur-sm"
                            : "text-(--text-tertiary) hover:text-(--text-primary)"
                        }`}
                >
                    <span>{flag}</span>
                    <span className="hidden sm:inline">{label}</span>
                </button>
            ))}
        </div>
    );
}
