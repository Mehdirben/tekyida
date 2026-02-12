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
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", handler, { passive: true });
        return () => window.removeEventListener("scroll", handler);
    }, []);

    const navLinks = [
        { href: "#features", label: t("nav.features") },
        { href: "#how-it-works", label: t("nav.howItWorks") },
    ];

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "liquid-glass-heavy" : ""
                }`}
        >
            <div className="max-w-6xl mx-auto px-5 sm:px-8">
                <div className="flex items-center justify-between h-16">
                    <Logo size="md" />

                    {/* Center nav */}
                    <nav className="hidden md:flex items-center">
                        <div className="flex items-center gap-1 liquid-glass rounded-full px-1.5 py-1">
                            {navLinks.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className="text-sm text-(--text-secondary) hover:text-(--text-primary) transition-colors duration-200 font-medium px-4 py-1.5 rounded-full hover:bg-white/20 dark:hover:bg-white/5"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>
                    </nav>

                    {/* Right actions */}
                    <div className="hidden md:flex items-center gap-2">
                        <LanguageToggle />
                        <ThemeToggle />
                        <Button size="sm" onClick={() => (window.location.href = "/app")}>
                            {t("nav.getStarted")}
                        </Button>
                    </div>

                    {/* Mobile */}
                    <button
                        className="md:hidden p-2 text-(--text-secondary) hover:text-(--text-primary) cursor-pointer transition-colors"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>

                {/* Mobile menu */}
                {mobileOpen && (
                    <div className="md:hidden liquid-glass-card p-4 mt-1 animate-scale-in">
                        <nav className="flex flex-col gap-1 mb-4">
                            {navLinks.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="text-sm text-(--text-secondary) hover:text-(--text-primary) transition-colors font-medium py-2.5 px-3 rounded-xl hover:bg-white/15 dark:hover:bg-white/5"
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
