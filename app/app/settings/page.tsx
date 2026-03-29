"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, LogOut, Eye, EyeOff, Download, CheckCircle, WifiOff, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { useTranslation } from "@/i18n/LanguageContext";
import { useAuthActions } from "@convex-dev/auth/react";
import { useSync } from "@/contexts/SyncContext";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { triggerHaptic } from "@/lib/haptics";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function SettingsPage() {
    const { t } = useTranslation();
    const { signOut } = useAuthActions();
    const router = useRouter();
    const { isOnline } = useSync();

    const [email, setEmail] = useState("");
    const [confirmEmail, setConfirmEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState("");
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [emailSuccess, setEmailSuccess] = useState("");

    const changePassword = useAction(api.users.changePassword);
    const changeEmail = useAction(api.users.changeEmail);
    const currentEmailData = useQuery(api.users.currentEmail);

    // PWA install prompt
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        const standalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as unknown as { standalone?: boolean }).standalone === true;
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

    const handleChangePassword = async () => {
        setPasswordError("");
        setPasswordSuccess("");

        if (!newPassword || newPassword.length < 6) {
            setPasswordError(t("settings.passwordTooShort"));
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError(t("settings.passwordMismatch"));
            return;
        }

        setPasswordLoading(true);
        try {
            await changePassword({ newPassword });
            setPasswordSuccess(t("settings.passwordChanged"));
            setNewPassword("");
            setConfirmPassword("");
        } catch {
            setPasswordError(t("settings.passwordChangeError"));
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleChangeEmail = async () => {
        setEmailError("");
        setEmailSuccess("");

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError(t("settings.emailInvalid"));
            return;
        }
        if (email !== confirmEmail) {
            setEmailError(t("settings.emailMismatch"));
            return;
        }

        setEmailLoading(true);
        try {
            await changeEmail({ newEmail: email });
            setEmailSuccess(t("settings.emailChanged"));
            setEmail("");
            setConfirmEmail("");
        } catch {
            setEmailError(t("settings.emailChangeError"));
        } finally {
            setEmailLoading(false);
        }
    };

    const handleSignOut = async () => {
        try { localStorage.removeItem("tekyida-authed"); } catch { }
        await signOut();
        router.push("/login");
    };

    return (
        <main className="flex-1 px-4 sm:px-6 pt-6 pb-4 max-w-2xl mx-auto w-full">
            {/* Title */}
            <div className="mb-8 animate-slide-up text-center">
                <h1 className="text-2xl font-extrabold tracking-tight">
                    <span className="gradient-text">{t("settings.title")}</span>
                </h1>
            </div>

            <div className="space-y-6">
                {/* Email Section */}
                <section className="liquid-glass-card p-6 animate-slide-up delay-100 relative">
                    {!isOnline && (
                        <div className="absolute inset-0 z-10 rounded-2xl bg-(--surface-primary)/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                            <WifiOff size={22} className="text-(--text-tertiary)" />
                            <span className="text-sm font-semibold text-(--text-tertiary)">{t("settings.offlineUnavailable")}</span>
                        </div>
                    )}
                    <h2 className="text-sm font-bold uppercase tracking-wider text-(--text-tertiary) mb-5">
                        {t("settings.email")}
                    </h2>
                    {currentEmailData && (
                        <p className="text-sm text-(--text-secondary) mb-4 ml-1">
                            {currentEmailData}
                        </p>
                    )}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 ml-1">
                                {t("settings.email")}
                            </label>
                            <div className="relative">
                                <Mail
                                    size={16}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary)"
                                />
                                <input
                                    type="email"
                                    className="glass-input pl-10"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={!isOnline}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 ml-1">
                                {t("settings.confirmEmail")}
                            </label>
                            <div className="relative">
                                <Mail
                                    size={16}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary)"
                                />
                                <input
                                    type="email"
                                    className="glass-input pl-10"
                                    placeholder="you@example.com"
                                    value={confirmEmail}
                                    onChange={(e) => setConfirmEmail(e.target.value)}
                                    disabled={!isOnline}
                                />
                            </div>
                        </div>
                        {emailError && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm text-center">
                                {emailError}
                            </div>
                        )}
                        {emailSuccess && (
                            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm text-center flex items-center justify-center gap-2">
                                <CheckCircle size={14} />
                                {emailSuccess}
                            </div>
                        )}
                        <div className="pt-1 flex justify-center">
                            <Button size="md" disabled={!isOnline || emailLoading} onClick={handleChangeEmail}>
                                {emailLoading ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    t("settings.saveEmail")
                                )}
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Password Section */}
                <section className="liquid-glass-card p-6 animate-slide-up delay-150 relative">
                    {!isOnline && (
                        <div className="absolute inset-0 z-10 rounded-2xl bg-(--surface-primary)/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                            <WifiOff size={22} className="text-(--text-tertiary)" />
                            <span className="text-sm font-semibold text-(--text-tertiary)">{t("settings.offlineUnavailable")}</span>
                        </div>
                    )}
                    <h2 className="text-sm font-bold uppercase tracking-wider text-(--text-tertiary) mb-5">
                        {t("settings.password")}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 ml-1">
                                {t("settings.newPassword")}
                            </label>
                            <div className="relative">
                                <Lock
                                    size={16}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary)"
                                />
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    className="glass-input pl-10 pr-10"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    disabled={!isOnline}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowNewPassword(!showNewPassword);
                                        triggerHaptic("selection");
                                    }}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary) hover:text-(--text-primary) transition-colors cursor-pointer"
                                >
                                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 ml-1">
                                {t("settings.confirmPassword")}
                            </label>
                            <div className="relative">
                                <Lock
                                    size={16}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary)"
                                />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    className="glass-input pl-10 pr-10"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={!isOnline}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowConfirmPassword(!showConfirmPassword);
                                        triggerHaptic("selection");
                                    }}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary) hover:text-(--text-primary) transition-colors cursor-pointer"
                                >
                                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        {passwordError && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm text-center">
                                {passwordError}
                            </div>
                        )}
                        {passwordSuccess && (
                            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm text-center flex items-center justify-center gap-2">
                                <CheckCircle size={14} />
                                {passwordSuccess}
                            </div>
                        )}
                        <div className="pt-1 flex justify-center">
                            <Button size="md" disabled={!isOnline || passwordLoading} onClick={handleChangePassword}>
                                {passwordLoading ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    t("settings.savePassword")
                                )}
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Appearance Section */}
                <section className="liquid-glass-card p-6 animate-slide-up delay-200">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-(--text-tertiary) mb-5">
                        {t("settings.appearance")}
                    </h2>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t("settings.appearance")}</span>
                        <ThemeToggle />
                    </div>
                </section>

                {/* Language Section */}
                <section className="liquid-glass-card p-6 animate-slide-up delay-300">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-(--text-tertiary) mb-5">
                        {t("settings.language")}
                    </h2>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t("settings.language")}</span>
                        <LanguageToggle />
                    </div>
                </section>

                {/* Install App Section */}
                <section className="liquid-glass-card p-6 animate-slide-up delay-400">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-(--text-tertiary) mb-5">
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
                <section className="liquid-glass-card p-6 animate-slide-up delay-500">
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
