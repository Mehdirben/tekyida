"use client";

import { BookPlus, UserPlus, ArrowLeftRight } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import type { TranslationKey } from "@/i18n/en";

interface Step {
    number: string;
    icon: React.ElementType;
    titleKey: TranslationKey;
    descKey: TranslationKey;
    iconBg: string;
    iconColor: string;
}

const steps: Step[] = [
    {
        number: "1",
        icon: BookPlus,
        titleKey: "howItWorks.step1.title",
        descKey: "howItWorks.step1.desc",
        iconBg: "bg-primary-500/15",
        iconColor: "text-primary-600 dark:text-primary-300",
    },
    {
        number: "2",
        icon: UserPlus,
        titleKey: "howItWorks.step2.title",
        descKey: "howItWorks.step2.desc",
        iconBg: "bg-gold-500/15",
        iconColor: "text-gold-600 dark:text-gold-400",
    },
    {
        number: "3",
        icon: ArrowLeftRight,
        titleKey: "howItWorks.step3.title",
        descKey: "howItWorks.step3.desc",
        iconBg: "bg-accent-500/15",
        iconColor: "text-accent-600 dark:text-accent-400",
    },
];

export default function HowItWorksSection() {
    const { t } = useTranslation();

    return (
        <section id="how-it-works" className="relative py-24 sm:py-32">
            <div className="max-w-5xl mx-auto px-5 sm:px-8">
                {/* Section header */}
                <div className="text-center mb-14">
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full liquid-glass text-xs font-semibold text-primary-600 dark:text-primary-300 mb-4">
                        {t("howItWorks.sectionTag")}
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                        {t("howItWorks.title")}
                    </h2>
                </div>

                {/* Steps */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                    {/* Glass connector — desktop */}
                    <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px bg-linear-to-r from-transparent via-(--glass-border) to-transparent" />

                    {steps.map((step) => {
                        const Icon = step.icon;
                        return (
                            <div key={step.number} className="relative text-center">
                                {/* Icon + badge */}
                                <div className="relative inline-flex items-center justify-center mb-5">
                                    <div className={`w-16 h-16 liquid-glass-card flex items-center justify-center ${step.iconBg}`}>
                                        <Icon size={28} className={step.iconColor} strokeWidth={1.8} />
                                    </div>
                                    <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-primary-800 dark:bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center z-10 shadow-md">
                                        {step.number}
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold mb-1.5">{t(step.titleKey)}</h3>
                                <p className="text-(--text-secondary) text-sm leading-relaxed max-w-xs mx-auto">
                                    {t(step.descKey)}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
