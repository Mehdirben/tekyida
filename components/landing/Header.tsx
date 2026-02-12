"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { useTranslation } from "@/i18n/LanguageContext";

export default function Header() {
    const { t } = useTranslation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const navLinks = [
        { href: "#features", label: t("nav.features") },
        { href: "#how-it-works", label: t("nav.howItWorks") },
    ];

    return (
        <header className="fixed top-0 left-0 right-0 z-50 pt-4 px-5 sm:px-8">
            <div
                className={`max-w-6xl mx-auto liquid-glass-card rounded-2xl px-5 py-3 transition-all duration-500 ${mounted ? "animate-slide-up" : "opacity-0"
                    }`}
            >
                <div className="flex items-center justify-between">
                    <Logo size="md" />

                    {/* Center nav — desktop */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="text-sm text-(--text-secondary) hover:text-(--text-primary) transition-colors duration-200 font-medium px-4 py-1.5 rounded-full hover:bg-white/20 dark:hover:bg-white/5"
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>

                    {/* Right actions — desktop */}
                    <div className="hidden md:flex items-center gap-2">
                        <LanguageToggle />
                        <ThemeToggle />
                        <Button size="sm" onClick={() => (window.location.href = "/app")}>
                            {t("nav.getStarted")}
                        </Button>
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        className="md:hidden p-2 text-(--text-secondary) hover:text-(--text-primary) cursor-pointer transition-colors"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>

                {/* Mobile dropdown */}
                {mobileOpen && (
                    <div className="md:hidden pt-3 mt-3 border-t border-(--border) animate-scale-in">
                        <nav className="flex flex-col gap-1 mb-3">
                            {navLinks.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="text-sm text-(--text-secondary) hover:text-(--text-primary) transition-colors font-medium py-2 px-3 rounded-xl hover:bg-white/15 dark:hover:bg-white/5"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </nav>
                        <div className="flex items-center gap-2 pt-3 border-t border-(--border)">
                            <LanguageToggle />
                            <ThemeToggle />
                            <Button
                                size="sm"
                                className="ml-auto"
                                onClick={() => (window.location.href = "/app")}
                            >
                                {t("nav.getStarted")}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
