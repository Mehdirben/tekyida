"use client";

import { BookPlus, UserPlus, ArrowLeftRight } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { useTranslation } from "@/i18n/LanguageContext";
import type { TranslationKey } from "@/i18n/en";

interface Step {
    number: string;
    icon: React.ElementType;
    titleKey: TranslationKey;
    descKey: TranslationKey;
    color: string;
    bgColor: string;
    borderColor: string;
}

const steps: Step[] = [
    {
        number: "01",
        icon: BookPlus,
        titleKey: "howItWorks.step1.title",
        descKey: "howItWorks.step1.desc",
        color: "text-primary-400",
        bgColor: "bg-primary-500/10",
        borderColor: "border-primary-500/20",
    },
    {
        number: "02",
        icon: UserPlus,
        titleKey: "howItWorks.step2.title",
        descKey: "howItWorks.step2.desc",
        color: "text-accent-400",
        bgColor: "bg-accent-500/10",
        borderColor: "border-accent-500/20",
    },
    {
        number: "03",
        icon: ArrowLeftRight,
        titleKey: "howItWorks.step3.title",
        descKey: "howItWorks.step3.desc",
        color: "text-primary-300",
        bgColor: "bg-primary-400/10",
        borderColor: "border-primary-400/20",
    },
];

export default function HowItWorksSection() {
    const { t } = useTranslation();

    return (
        <section id="how-it-works" className="relative py-24 sm:py-32">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                {/* Section header */}
                <div className="text-center mb-16">
                    <Badge variant="primary" className="mb-4">
                        {t("howItWorks.sectionTag")}
                    </Badge>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                        {t("howItWorks.title")}
                    </h2>
                </div>

                {/* Steps */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                    {/* Connector line (desktop only) */}
                    <div className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-primary-500/30 via-accent-500/30 to-primary-400/30" />

                    {steps.map((step, i) => {
                        const Icon = step.icon;
                        return (
                            <div
                                key={step.number}
                                className={`relative text-center animate-slide-up delay-${(i + 1) * 200}`}
                            >
                                {/* Step number + icon */}
                                <div className="relative inline-flex flex-col items-center mb-6">
                                    <span className="text-xs font-bold text-[var(--text-tertiary)] tracking-widest uppercase mb-3">
                                        Step {step.number}
                                    </span>
                                    <div
                                        className={`w-16 h-16 ${step.bgColor} ${step.borderColor} border rounded-2xl flex items-center justify-center relative z-10 bg-[var(--bg)]`}
                                    >
                                        <Icon size={28} className={step.color} strokeWidth={1.8} />
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold mb-2">{t(step.titleKey)}</h3>
                                <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-xs mx-auto">
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
