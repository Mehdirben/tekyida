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
        const handler = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handler, { passive: true });
        return () => window.removeEventListener("scroll", handler);
    }, []);

    const navLinks = [
        { href: "#features", label: t("nav.features") },
        { href: "#how-it-works", label: t("nav.howItWorks") },
    ];

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                    ? "glass shadow-lg shadow-[var(--shadow-color)]"
                    : "bg-transparent"
                }`}
        >
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Logo size="md" />

                    {/* Desktop nav */}
                    <nav className="hidden md:flex items-center gap-6">
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200 font-medium"
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>

                    {/* Desktop actions */}
                    <div className="hidden md:flex items-center gap-3">
                        <LanguageToggle />
                        <ThemeToggle />
                        <Button size="sm" onClick={() => (window.location.href = "/app")}>
                            {t("nav.getStarted")}
                        </Button>
                    </div>

                    {/* Mobile menu button */}
                    <button
                        className="md:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>

                {/* Mobile menu */}
                {mobileOpen && (
                    <div className="md:hidden glass rounded-2xl mt-2 p-4 animate-slide-up">
                        <nav className="flex flex-col gap-3 mb-4">
                            {navLinks.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium py-2"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </nav>
                        <div className="flex items-center gap-3 pt-3 border-t border-[var(--border)]">
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
