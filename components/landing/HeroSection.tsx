"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useTranslation } from "@/i18n/LanguageContext";

export default function HeroSection() {
    const { t } = useTranslation();

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
            {/* Background decorations */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Gradient bg */}
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--hero-gradient-from)] to-[var(--hero-gradient-to)]" />

                {/* Floating orbs */}
                <div className="absolute top-1/4 left-1/6 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-1/4 right-1/6 w-96 h-96 bg-primary-400/8 rounded-full blur-3xl animate-float-slow" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/5 rounded-full blur-3xl animate-pulse-glow" />

                {/* Grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage:
                            "linear-gradient(var(--text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)",
                        backgroundSize: "60px 60px",
                    }}
                />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
                {/* Tag */}
                <div className="animate-fade-in">
                    <Badge variant="primary" className="mb-6 text-sm px-4 py-1.5">
                        <Sparkles size={14} />
                        {t("hero.tagline")}
                    </Badge>
                </div>

                {/* Title */}
                <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 animate-slide-up">
                    <span className="block">{t("hero.title.line1")}</span>
                    <span className="block gradient-text">{t("hero.title.line2")}</span>
                </h1>

                {/* Subtitle */}
                <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 animate-slide-up delay-200 leading-relaxed">
                    {t("hero.subtitle")}
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up delay-400">
                    <Button size="lg" onClick={() => (window.location.href = "/app")}>
                        {t("hero.cta.primary")}
                        <ArrowRight size={18} />
                    </Button>
                    <Button
                        variant="secondary"
                        size="lg"
                        onClick={() =>
                            document
                                .getElementById("how-it-works")
                                ?.scrollIntoView({ behavior: "smooth" })
                        }
                    >
                        {t("hero.cta.secondary")}
                    </Button>
                </div>

                {/* Mockup preview */}
                <div className="mt-16 animate-slide-up delay-600">
                    <div className="relative max-w-sm mx-auto">
                        {/* Glow behind mockup */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-primary-500/20 via-primary-400/10 to-primary-600/20 rounded-3xl blur-2xl" />

                        {/* Phone mockup */}
                        <div className="relative bg-[var(--bg-card)] rounded-3xl border border-[var(--border)] shadow-2xl shadow-[var(--shadow-color)] overflow-hidden">
                            {/* Status bar */}
                            <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)]">
                                <span className="text-xs text-[var(--text-tertiary)]">9:41</span>
                                <div className="flex gap-1">
                                    <div className="w-3.5 h-2 bg-[var(--text-tertiary)] rounded-sm" />
                                    <div className="w-1.5 h-2 bg-[var(--text-tertiary)] rounded-sm" />
                                </div>
                            </div>

                            {/* App header */}
                            <div className="px-6 py-4 border-b border-[var(--border)]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-[var(--text-tertiary)] mb-0.5">
                                            📒 Personnel
                                        </p>
                                        <h3 className="text-lg font-bold">Mes Dettes</h3>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-[var(--text-tertiary)]">Solde</p>
                                        <p className="text-lg font-bold text-accent-500">
                                            +1,250 MAD
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Mock entries */}
                            <div className="divide-y divide-[var(--border)]">
                                {[
                                    { name: "Ahmed K.", amount: "+500", positive: true },
                                    { name: "Sara M.", amount: "-200", positive: false },
                                    { name: "Youssef B.", amount: "+950", positive: true },
                                ].map((entry) => (
                                    <div
                                        key={entry.name}
                                        className="flex items-center justify-between px-6 py-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-primary-500/15 flex items-center justify-center text-sm font-bold text-primary-400">
                                                {entry.name[0]}
                                            </div>
                                            <span className="text-sm font-medium">{entry.name}</span>
                                        </div>
                                        <span
                                            className={`text-sm font-bold ${entry.positive ? "text-accent-500" : "text-danger-500"
                                                }`}
                                        >
                                            {entry.amount} MAD
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Bottom padding */}
                            <div className="h-6" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
