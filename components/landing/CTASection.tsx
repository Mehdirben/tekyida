"use client";

import { ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/i18n/LanguageContext";

export default function CTASection() {
    const { t } = useTranslation();

    return (
        <section className="relative py-24 sm:py-32">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <div className="relative overflow-hidden rounded-3xl">
                    {/* Background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900" />

                    {/* Decorative orbs */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-300/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

                    {/* Grid overlay */}
                    <div
                        className="absolute inset-0 opacity-[0.05]"
                        style={{
                            backgroundImage:
                                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                            backgroundSize: "40px 40px",
                        }}
                    />

                    {/* Content */}
                    <div className="relative z-10 py-16 px-8 sm:px-16 text-center">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
                            {t("cta.title")}
                        </h2>
                        <p className="text-primary-100/80 text-lg max-w-xl mx-auto mb-8">
                            {t("cta.subtitle")}
                        </p>
                        <Button
                            size="lg"
                            className="!bg-white !text-primary-700 hover:!bg-primary-50 !shadow-xl hover:!shadow-2xl"
                            onClick={() => (window.location.href = "/app")}
                        >
                            {t("cta.button")}
                            <ArrowRight size={18} />
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
