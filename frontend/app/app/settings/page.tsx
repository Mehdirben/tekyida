"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Download, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LanguageToggle from "@/components/ui/LanguageToggle";
import AmountsLoadBehaviorToggle from "@/components/ui/AmountsLoadBehaviorToggle";
import TransferRedirectToggle from "@/components/ui/TransferRedirectToggle";
import EmailSection from "@/components/settings/EmailSection";
import PasswordSection from "@/components/settings/PasswordSection";
import SecuritySection from "@/components/settings/SecuritySection";
import { useTranslation } from "@/i18n/LanguageContext";
import { useAuthActions } from "@convex-dev/auth/react";
import { useEntryAnimation } from "@/hooks/useEntryAnimation";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function SettingsPage() {
    const { t } = useTranslation();
    const { signOut } = useAuthActions();
    const router = useRouter();

    const animateIn = useEntryAnimation();

    // PWA install prompt
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        const standalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as unknown as { standalone?: boolean }).standalone === true;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser state after mount to avoid SSR hydration mismatch
        setIsInstalled(standalone);

        // Listen for install prompt
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };
        window.addEventListener("beforeinstallprompt", handler);

        // Listen for successful install
        const installedHandler = () => setIsInstalled(true);
        window.addEventListener("appinstalled", installedHandler);

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
            window.removeEventListener("appinstalled", installedHandler);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setIsInstalled(true);
        }
        setDeferredPrompt(null);
    };

    const handleSignOut = async () => {
        try { localStorage.removeItem("tekyida-authed"); } catch { }
        await signOut();
        router.push("/login");
    };

    return (
        <main className="app-safe-top flex-1 sm:px-6 pb-4 max-w-2xl mx-auto w-full">
            {/* Title */}
            <div className={`mb-8 ${animateIn ? "animate-slide-up" : ""} text-center`}>
                <h1 className="text-2xl font-extrabold tracking-tight">
                    <span className="gradient-text">{t("settings.title")}</span>
                </h1>
            </div>

            <div className="space-y-6">
                <EmailSection animateIn={animateIn} />

                <PasswordSection animateIn={animateIn} />

                <SecuritySection animateIn={animateIn} />

                {/* Appearance Section */}
                <section className={`liquid-glass-card p-6 ${animateIn ? "animate-slide-up delay-200" : ""}`}>
                    <h2 className="text-center sm:text-left text-sm font-bold uppercase tracking-wider text-(--text-tertiary) mb-5">
                        {t("settings.appearance")}
                    </h2>
                    <div className="flex items-center justify-center sm:justify-between gap-4">
                        <span className="hidden sm:block text-sm font-medium min-w-0 flex-1">{t("settings.appearance")}</span>
                        <ThemeToggle />
                    </div>
                </section>

                {/* Language Section */}
                <section className={`liquid-glass-card p-6 ${animateIn ? "animate-slide-up delay-300" : ""}`}>
                    <h2 className="text-center sm:text-left text-sm font-bold uppercase tracking-wider text-(--text-tertiary) mb-5">
                        {t("settings.language")}
                    </h2>
                    <div className="flex items-center justify-center sm:justify-between gap-4">
                        <span className="hidden sm:block text-sm font-medium min-w-0 flex-1">{t("settings.language")}</span>
                        <LanguageToggle />
                    </div>
                </section>

                {/* Amounts on Load Section */}
                <section className={`liquid-glass-card p-6 ${animateIn ? "animate-slide-up delay-400" : ""}`}>
                    <h2 className="text-center sm:text-left text-sm font-bold uppercase tracking-wider text-(--text-tertiary) mb-5">
                        {t("settings.amountsOnLoad")}
                    </h2>
                    <div className="flex items-center justify-center sm:justify-between gap-4">
                        <span className="hidden sm:block text-sm font-medium min-w-0 flex-1">{t("settings.amountsOnLoad")}</span>
                        <AmountsLoadBehaviorToggle />
                    </div>
                </section>

                {/* Transfer Redirect Section */}
                <section className={`liquid-glass-card p-6 ${animateIn ? "animate-slide-up delay-400" : ""}`}>
                    <h2 className="text-center sm:text-left text-sm font-bold uppercase tracking-wider text-(--text-tertiary) mb-5">
                        {t("settings.transferOnMove")}
                    </h2>
                    <div className="flex items-center justify-center sm:justify-between gap-4">
                        <span className="hidden sm:block text-sm font-medium min-w-0 flex-1">{t("settings.transferOnMove")}</span>
                        <TransferRedirectToggle />
                    </div>
                </section>

                {/* Install App Section */}
                <section className={`liquid-glass-card p-6 ${animateIn ? "animate-slide-up delay-500" : ""}`}>
                    <h2 className="text-center sm:text-left text-sm font-bold uppercase tracking-wider text-(--text-tertiary) mb-5">
                        {t("settings.installApp")}
                    </h2>
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-(--text-secondary)">
                                {t("settings.installDescription")}
                            </p>
                        </div>
                        {isInstalled ? (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-500/10 text-accent-500 shrink-0">
                                <CheckCircle size={16} />
                                <span className="text-xs font-semibold">{t("settings.installed")}</span>
                            </div>
                        ) : deferredPrompt ? (
                            <Button size="md" onClick={handleInstall}>
                                <Download size={16} />
                                {t("settings.install")}
                            </Button>
                        ) : (
                            <span className="text-xs text-(--text-tertiary) shrink-0 max-w-[140px] text-right leading-snug">
                                {t("settings.installHint")}
                            </span>
                        )}
                    </div>
                </section>

                {/* Sign Out Section */}
                <section className={`liquid-glass-card p-6 ${animateIn ? "animate-slide-up delay-600" : ""}`}>
                    <Button
                        variant="danger"
                        size="md"
                        className="w-full"
                        onClick={handleSignOut}
                    >
                        <LogOut size={16} />
                        {t("settings.signOut")}
                    </Button>
                </section>
            </div>
        </main>
    );
}
