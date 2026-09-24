"use client";

import {
    BookOpen,
    Coins,
    Languages,
    Cloud,
    Wifi,
    ShieldCheck,
    type LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import type { TranslationKey } from "@/i18n/en";

interface Feature {
    icon: LucideIcon;
    titleKey: TranslationKey;
    descKey: TranslationKey;
    iconBg: string;
    iconColor: string;
}

const features: Feature[] = [
    {
        icon: BookOpen,
        titleKey: "features.notebooks.title",
        descKey: "features.notebooks.desc",
        iconBg: "bg-primary-500/15",
        iconColor: "text-primary-600 dark:text-primary-300",
    },
    {
        icon: Coins,
        titleKey: "features.currency.title",
        descKey: "features.currency.desc",
        iconBg: "bg-gold-500/15",
        iconColor: "text-gold-600 dark:text-gold-400",
    },
    {
        icon: Languages,
        titleKey: "features.bilingual.title",
        descKey: "features.bilingual.desc",
        iconBg: "bg-primary-400/15",
        iconColor: "text-primary-500 dark:text-primary-300",
    },
    {
        icon: Cloud,
        titleKey: "features.cloud.title",
        descKey: "features.cloud.desc",
        iconBg: "bg-accent-500/15",
        iconColor: "text-accent-600 dark:text-accent-400",
    },
    {
        icon: Wifi,
        titleKey: "features.pwa.title",
        descKey: "features.pwa.desc",
        iconBg: "bg-gold-500/15",
        iconColor: "text-gold-600 dark:text-gold-400",
    },
    {
        icon: ShieldCheck,
        titleKey: "features.secure.title",
        descKey: "features.secure.desc",
        iconBg: "bg-primary-500/15",
        iconColor: "text-primary-600 dark:text-primary-300",
    },
];

export default function FeaturesSection() {
    const { t } = useTranslation();

    return (
        <section id="features" className="relative py-14 sm:py-20">
            <div className="max-w-6xl mx-auto px-5 sm:px-8">
                {/* Section header */}
                <div className="text-center mb-14">
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full liquid-glass text-xs font-semibold text-primary-600 dark:text-primary-300 mb-4">
                        {t("features.sectionTag")}
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                        {t("features.title")}
                    </h2>
                    <p className="text-(--text-secondary) text-base max-w-lg mx-auto">
                        {t("features.subtitle")}
                    </p>
                </div>

                {/* Feature grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {features.map((feature) => {
                        const Icon = feature.icon;
                        return (
                            <div
                                key={feature.titleKey}
                                className="liquid-glass-card p-6 glass-shimmer"
                            >
                                <div
                                    className={`w-11 h-11 ${feature.iconBg} rounded-xl flex items-center justify-center mb-4`}
                                >
                                    <Icon size={22} className={feature.iconColor} strokeWidth={1.8} />
                                </div>
                                <h3 className="text-base font-bold mb-1.5">
                                    {t(feature.titleKey)}
                                </h3>
                                <p className="text-(--text-secondary) text-sm leading-relaxed">
                                    {t(feature.descKey)}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
