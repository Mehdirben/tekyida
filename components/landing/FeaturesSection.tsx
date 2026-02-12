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
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useTranslation } from "@/i18n/LanguageContext";
import type { TranslationKey } from "@/i18n/en";

interface Feature {
    icon: LucideIcon;
    titleKey: TranslationKey;
    descKey: TranslationKey;
    color: string;
    bgColor: string;
}

const features: Feature[] = [
    {
        icon: BookOpen,
        titleKey: "features.notebooks.title",
        descKey: "features.notebooks.desc",
        color: "text-primary-400",
        bgColor: "bg-primary-500/10",
    },
    {
        icon: Coins,
        titleKey: "features.currency.title",
        descKey: "features.currency.desc",
        color: "text-accent-400",
        bgColor: "bg-accent-500/10",
    },
    {
        icon: Languages,
        titleKey: "features.bilingual.title",
        descKey: "features.bilingual.desc",
        color: "text-primary-300",
        bgColor: "bg-primary-400/10",
    },
    {
        icon: Cloud,
        titleKey: "features.cloud.title",
        descKey: "features.cloud.desc",
        color: "text-primary-400",
        bgColor: "bg-primary-500/10",
    },
    {
        icon: Wifi,
        titleKey: "features.pwa.title",
        descKey: "features.pwa.desc",
        color: "text-accent-400",
        bgColor: "bg-accent-500/10",
    },
    {
        icon: ShieldCheck,
        titleKey: "features.secure.title",
        descKey: "features.secure.desc",
        color: "text-primary-300",
        bgColor: "bg-primary-400/10",
    },
];

export default function FeaturesSection() {
    const { t } = useTranslation();

    return (
        <section id="features" className="relative py-24 sm:py-32">
            {/* Background accent */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
                {/* Section header */}
                <div className="text-center mb-16">
                    <Badge variant="primary" className="mb-4">
                        {t("features.sectionTag")}
                    </Badge>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                        {t("features.title")}
                    </h2>
                    <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto">
                        {t("features.subtitle")}
                    </p>
                </div>

                {/* Feature grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, i) => {
                        const Icon = feature.icon;
                        return (
                            <Card
                                key={feature.titleKey}
                                hover
                                className={`p-6 animate-slide-up delay-${(i + 1) * 100}`}
                            >
                                <div
                                    className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4`}
                                >
                                    <Icon size={24} className={feature.color} strokeWidth={2} />
                                </div>
                                <h3 className="text-lg font-bold mb-2">
                                    {t(feature.titleKey)}
                                </h3>
                                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                                    {t(feature.descKey)}
                                </p>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
