"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/i18n/LanguageContext";

export default function CTASection() {
    const { t } = useTranslation();

    return (
        <section className="relative py-14 sm:py-20">
            <div className="max-w-3xl mx-auto px-5 sm:px-8">
                <div className="liquid-glass-card p-10 sm:p-14 text-center relative overflow-hidden">
                    {/* Shimmer */}
                    <div className="absolute inset-0 glass-shimmer rounded-[1.25rem]" />

                    {/* Content */}
                    <div className="relative z-10">
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                            {t("cta.title")}
                        </h2>
                        <p className="text-(--text-secondary) text-base sm:text-lg max-w-lg mx-auto mb-8">
                            {t("cta.subtitle")}
                        </p>
                        <Link href="/app">
                            <Button size="lg">
                                {t("cta.button")}
                                <ArrowRight size={16} />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
