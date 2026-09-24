"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";
import { useTranslation } from "@/i18n/LanguageContext";

export default function HeroSection() {
    const { t } = useTranslation();

    return (
        <section className="landing-safe-hero relative flex items-center justify-center overflow-hidden">

            {/* ── Floating Glass Product Cards ── */}

            {/* Top-left — Notebooks card */}
            <div
                className="hidden lg:block absolute top-32 left-6 xl:left-16 liquid-glass-card p-4 w-56 animate-float z-10"
                style={{ "--float-rotate": "-3deg" } as React.CSSProperties}
            >
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-gold-500/20 flex items-center justify-center">
                        <span className="text-sm">📒</span>
                    </div>
                    <span className="text-xs font-semibold">Carnets</span>
                </div>
                <div className="space-y-2.5">
                    <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-(--text-secondary)">Personnel</span>
                            <span className="text-accent-500 font-bold">+1,250 MAD</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/20 dark:bg-white/5 overflow-hidden">
                            <div className="h-full w-[72%] bg-accent-500/80 rounded-full" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-(--text-secondary)">Business</span>
                            <span className="text-danger-500 font-bold">-340 MAD</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/20 dark:bg-white/5 overflow-hidden">
                            <div className="h-full w-[38%] bg-danger-500/80 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Top-right — Person balance */}
            <div
                className="hidden lg:block absolute top-36 right-6 xl:right-16 liquid-glass-card p-4 w-52 animate-float-alt z-10"
                style={{ "--float-rotate": "2deg" } as React.CSSProperties}
            >
                <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-full bg-primary-500/15 flex items-center justify-center text-xs font-bold text-primary-600 dark:text-primary-300">
                        A
                    </div>
                    <div>
                        <p className="text-xs font-semibold">Ahmed K.</p>
                        <p className="text-[10px] text-(--text-tertiary)">2 transactions</p>
                    </div>
                </div>
                <div className="liquid-glass rounded-xl px-3 py-2 flex items-center justify-between">
                    <span className="text-[10px] text-(--text-tertiary) uppercase tracking-wider font-medium">Solde</span>
                    <span className="text-sm font-bold text-accent-500">+500 MAD</span>
                </div>
            </div>

            {/* Bottom-left — Transactions */}
            <div
                className="hidden lg:block absolute bottom-32 left-6 xl:left-12 liquid-glass-card p-4 w-64 animate-float-alt z-10"
                style={{ "--float-rotate": "2deg" } as React.CSSProperties}
            >
                <p className="text-xs font-semibold mb-3">Transactions récentes</p>
                <div className="space-y-2">
                    {[
                        { name: "Sara M.", amount: "-200", positive: false, date: "Fév 10" },
                        { name: "Youssef B.", amount: "+950", positive: true, date: "Fév 8" },
                    ].map((tx) => (
                        <div key={tx.name} className="flex items-center justify-between liquid-glass rounded-xl px-3 py-2">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary-500/10 flex items-center justify-center text-[9px] font-bold text-primary-600 dark:text-primary-300">
                                    {tx.name[0]}
                                </div>
                                <div>
                                    <p className="text-[11px] font-medium">{tx.name}</p>
                                    <p className="text-[9px] text-(--text-tertiary)">{tx.date}</p>
                                </div>
                            </div>
                            <span className={`text-xs font-bold ${tx.positive ? "text-accent-500" : "text-danger-500"}`}>
                                {tx.amount} MAD
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom-right — Features pills */}
            <div
                className="hidden lg:block absolute bottom-36 right-6 xl:right-12 liquid-glass-card p-4 w-52 animate-float z-10"
                style={{ "--float-rotate": "-2deg" } as React.CSSProperties}
            >
                <p className="text-xs font-semibold mb-3">Fonctionnalités</p>
                <div className="flex flex-wrap gap-1.5">
                    {["🇫🇷 FR/EN", "☁️ Cloud", "📱 PWA", "🔒 Auth", "💰 MAD"].map((feat) => (
                        <span
                            key={feat}
                            className="text-[10px] font-medium px-2.5 py-1 rounded-full liquid-glass text-(--text-secondary)"
                        >
                            {feat}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── Center Hero Content ── */}
            <div className="relative z-20 max-w-3xl mx-auto px-5 text-center">
                {/* Logo icon */}
                <div className="flex justify-center mb-8">
                    <Logo size="lg" showText={false} />
                </div>

                {/* Headline */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-extrabold tracking-tight leading-[1.08] mb-6">
                    <span className="block">{t("hero.title.line1")}</span>
                    <span className="block gradient-text">{t("hero.title.line2")}</span>
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-(--text-secondary) max-w-xl mx-auto mb-10 leading-relaxed">
                    {t("hero.subtitle")}
                </p>

                {/* CTA */}
                <div>
                    <Link href="/app">
                        <Button size="lg">
                            {t("hero.cta.primary")}
                            <ArrowRight size={16} />
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}
