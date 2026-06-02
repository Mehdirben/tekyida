"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, LogOut, Eye, EyeOff, Download, CheckCircle, WifiOff, Loader2, Shield } from "lucide-react";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LanguageToggle from "@/components/ui/LanguageToggle";
import AmountsLoadBehaviorToggle from "@/components/ui/AmountsLoadBehaviorToggle";
import { useTranslation } from "@/i18n/LanguageContext";
import { useAuthActions } from "@convex-dev/auth/react";
import { useSync } from "@/contexts/SyncContext";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { triggerHaptic } from "@/lib/haptics";
import PinPad from "@/components/ui/PinPad";
import { hashPin, generateSalt } from "@/lib/crypto";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function SettingsPage() {
    const { t } = useTranslation();
    const { signOut } = useAuthActions();
    const router = useRouter();
    const { isOnline } = useSync();

    // Security & App Lock states
    const [isLockEnabled, setIsLockEnabled] = useState(false);
    const [showPinSetup, setShowPinSetup] = useState<"setup" | "confirm" | "verify_disable" | "verify_change" | "change_new" | "change_confirm" | null>(null);
    const [isClosingModal, setIsClosingModal] = useState(false);
    const [setupPin, setSetupPin] = useState("");
    const [modalPin, setModalPin] = useState("");
    const [modalError, setModalError] = useState(false);
    const [securitySuccess, setSecuritySuccess] = useState("");

    useEffect(() => {
        const lockEnabled = localStorage.getItem("tekyida-lock-enabled") === "true";
        setIsLockEnabled(lockEnabled);
    }, []);

    const handleLockToggleClick = () => {
        triggerHaptic("selection");
        if (isLockEnabled) {
            setModalPin("");
            setModalError(false);
            setShowPinSetup("verify_disable");
        } else {
            setSetupPin("");
            setModalPin("");
            setModalError(false);
            setShowPinSetup("setup");
        }
    };

    const closePinSetup = useCallback(() => {
        setIsClosingModal(true);
        setTimeout(() => {
            setShowPinSetup(null);
            setIsClosingModal(false);
        }, 250); // Matches .animate-scale-out duration (250ms)
    }, []);

    // Biometric features have been disabled as they prompt standard browser password managers on some platforms.

    const handlePinComplete = async (enteredPin: string) => {
        if (showPinSetup === "setup") {
            setSetupPin(enteredPin);
            setModalPin("");
            setShowPinSetup("confirm");
            triggerHaptic("medium");
        } else if (showPinSetup === "confirm") {
            if (enteredPin === setupPin) {
                const salt = generateSalt();
                const hash = await hashPin(enteredPin, salt);
                localStorage.setItem("tekyida-lock-pin-hash", hash);
                localStorage.setItem("tekyida-lock-pin-salt", salt);
                localStorage.setItem("tekyida-lock-enabled", "true");
                setIsLockEnabled(true);
                setModalPin("");
                triggerHaptic("medium");
                
                closePinSetup();
                setSecuritySuccess(t("lock.pinSuccess"));
                setTimeout(() => setSecuritySuccess(""), 4000);
            } else {
                setModalError(true);
                setModalPin("");
            }
        } else if (showPinSetup === "verify_disable") {
            const storedHash = localStorage.getItem("tekyida-lock-pin-hash");
            const storedSalt = localStorage.getItem("tekyida-lock-pin-salt");
            if (storedHash && storedSalt) {
                const computedHash = await hashPin(enteredPin, storedSalt);
                if (computedHash === storedHash) {
                    localStorage.removeItem("tekyida-lock-enabled");
                    localStorage.removeItem("tekyida-lock-pin-hash");
                    localStorage.removeItem("tekyida-lock-pin-salt");
                    setIsLockEnabled(false);
                    closePinSetup();
                    setModalPin("");
                    triggerHaptic("medium");
                } else {
                    setModalError(true);
                    setModalPin("");
                }
            } else {
                closePinSetup();
            }
        } else if (showPinSetup === "verify_change") {
            const storedHash = localStorage.getItem("tekyida-lock-pin-hash");
            const storedSalt = localStorage.getItem("tekyida-lock-pin-salt");
            if (storedHash && storedSalt) {
                const computedHash = await hashPin(enteredPin, storedSalt);
                if (computedHash === storedHash) {
                    setSetupPin("");
                    setModalPin("");
                    setShowPinSetup("change_new");
                    triggerHaptic("medium");
                } else {
                    setModalError(true);
                    setModalPin("");
                }
            } else {
                closePinSetup();
            }
        } else if (showPinSetup === "change_new") {
            setSetupPin(enteredPin);
            setModalPin("");
            setShowPinSetup("change_confirm");
            triggerHaptic("medium");
        } else if (showPinSetup === "change_confirm") {
            if (enteredPin === setupPin) {
                const salt = generateSalt();
                const hash = await hashPin(enteredPin, salt);
                localStorage.setItem("tekyida-lock-pin-hash", hash);
                localStorage.setItem("tekyida-lock-pin-salt", salt);
                closePinSetup();
                setModalPin("");
                triggerHaptic("medium");
                setSecuritySuccess(t("lock.pinSuccess"));
                setTimeout(() => setSecuritySuccess(""), 4000);
            } else {
                setModalError(true);
                setModalPin("");
            }
        }
    };

    const [email, setEmail] = useState("");
    const [confirmEmail, setConfirmEmail] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
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

        if (!currentPassword) {
            setPasswordError(t("settings.currentPasswordRequired"));
            return;
        }
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
            await changePassword({ currentPassword, newPassword });
            setPasswordSuccess(t("settings.passwordChanged"));
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            const msg = (err as Error)?.message ?? "";
            if (msg.includes("incorrect")) {
                setPasswordError(t("settings.currentPasswordWrong"));
            } else {
                setPasswordError(t("settings.passwordChangeError"));
            }
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

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && showPinSetup && !isClosingModal) {
                triggerHaptic("light");
                closePinSetup();
            }
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [showPinSetup, isClosingModal, closePinSetup]);

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
                    <h2 className="text-center sm:text-left text-sm font-bold uppercase tracking-wider text-(--text-tertiary) mb-5">
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
                    <h2 className="text-center sm:text-left text-sm font-bold uppercase tracking-wider text-(--text-tertiary) mb-5">
                        {t("settings.password")}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 ml-1">
                                {t("settings.currentPassword")}
                            </label>
                            <div className="relative">
                                <Lock
                                    size={16}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary)"
                                />
                                <input
                                    type={showCurrentPassword ? "text" : "password"}
                                    className="glass-input pl-10 pr-10"
                                    placeholder="••••••••"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    disabled={!isOnline}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCurrentPassword(!showCurrentPassword);
                                        triggerHaptic("selection");
                                    }}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary) hover:text-(--text-primary) transition-colors cursor-pointer"
                                >
                                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
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

                {/* Security Section (App Lock) */}
                <section className="liquid-glass-card p-6 animate-slide-up delay-175">
                    <h2 className="text-center sm:text-left text-sm font-bold uppercase tracking-wider text-(--text-tertiary) mb-5">
                        {t("settings.security")}
                    </h2>
                    
                    {securitySuccess && (
                        <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs text-center flex items-center justify-center gap-2">
                            <CheckCircle size={14} />
                            {securitySuccess}
                        </div>
                    )}

                    <div className="space-y-5">
                        {/* App Lock PIN toggle */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium block">{t("settings.appLock")}</span>
                                <span className="text-xs text-(--text-tertiary) block mt-0.5 leading-snug">
                                    {t("settings.appLockDesc")}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleLockToggleClick}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none cursor-pointer ${
                                    isLockEnabled ? "bg-primary-500" : "bg-(--text-tertiary)/25"
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                        isLockEnabled ? "translate-x-5" : "translate-x-0"
                                    }`}
                                />
                            </button>
                        </div>

                        {isLockEnabled && (
                            <>
                                <div className="h-px bg-(--border) w-full" />
                                
                                {/* Change PIN Button */}
                                <div className="pt-1 flex justify-center">
                                    <Button
                                        size="md"
                                        onClick={() => {
                                            triggerHaptic("selection");
                                            setModalPin("");
                                            setModalError(false);
                                            setShowPinSetup("verify_change");
                                        }}
                                    >
                                        {t("settings.changePin")}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </section>

                {/* Appearance Section */}
                <section className="liquid-glass-card p-6 animate-slide-up delay-200">
                    <h2 className="text-center sm:text-left text-sm font-bold uppercase tracking-wider text-(--text-tertiary) mb-5">
                        {t("settings.appearance")}
                    </h2>
                    <div className="flex items-center justify-center sm:justify-between gap-4">
                        <span className="hidden sm:block text-sm font-medium min-w-0 flex-1">{t("settings.appearance")}</span>
                        <ThemeToggle />
                    </div>
                </section>

                {/* Language Section */}
                <section className="liquid-glass-card p-6 animate-slide-up delay-300">
                    <h2 className="text-center sm:text-left text-sm font-bold uppercase tracking-wider text-(--text-tertiary) mb-5">
                        {t("settings.language")}
                    </h2>
                    <div className="flex items-center justify-center sm:justify-between gap-4">
                        <span className="hidden sm:block text-sm font-medium min-w-0 flex-1">{t("settings.language")}</span>
                        <LanguageToggle />
                    </div>
                </section>

                {/* Amounts on Load Section */}
                <section className="liquid-glass-card p-6 animate-slide-up delay-400">
                    <h2 className="text-center sm:text-left text-sm font-bold uppercase tracking-wider text-(--text-tertiary) mb-5">
                        {t("settings.amountsOnLoad")}
                    </h2>
                    <div className="flex items-center justify-center sm:justify-between gap-4">
                        <span className="hidden sm:block text-sm font-medium min-w-0 flex-1">{t("settings.amountsOnLoad")}</span>
                        <AmountsLoadBehaviorToggle />
                    </div>
                </section>

                {/* Install App Section */}
                <section className="liquid-glass-card p-6 animate-slide-up delay-500">
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
                <section className="liquid-glass-card p-6 animate-slide-up delay-600">
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

            {/* PIN Setup & Verify Overlay Modal */}
            {showPinSetup && (
                <div 
                    className={`fixed inset-0 z-[1000] flex items-center justify-center bg-black/10 dark:bg-black/30 backdrop-blur-md px-4 py-6 ${
                        isClosingModal ? "animate-fade-out" : "animate-fade-in"
                    }`}
                >
                    <div 
                        className={`liquid-glass-card p-6 sm:p-8 w-full max-w-sm flex flex-col justify-between items-center text-center shadow-2xl relative ${
                            isClosingModal ? "animate-scale-out" : "animate-scale-in"
                        }`}
                    >
                        {/* Header */}
                        <div className="flex flex-col items-center mt-2 space-y-3">
                            <div className="relative p-3 rounded-2xl liquid-glass text-primary-500 dark:text-primary-400">
                                <Shield size={28} />
                            </div>
                            <h2 className="text-base font-bold tracking-tight text-(--text-primary)">
                                {showPinSetup === "setup" && t("lock.setPin")}
                                {showPinSetup === "confirm" && t("lock.confirmPin")}
                                {showPinSetup === "verify_disable" && t("lock.enterCurrentPin")}
                                {showPinSetup === "verify_change" && t("lock.enterCurrentPin")}
                                {showPinSetup === "change_new" && t("lock.enterNewPin")}
                                {showPinSetup === "change_confirm" && t("lock.confirmPin")}
                            </h2>
                        </div>

                        {/* Content / Pad */}
                        <div className="w-full flex-1 flex items-center justify-center my-6">
                            <PinPad
                                value={modalPin}
                                onChange={setModalPin}
                                onComplete={handlePinComplete}
                                error={modalError}
                                onClearError={() => setModalError(false)}
                                title={modalError ? t("lock.invalidPin") : undefined}
                            />
                        </div>

                        {/* Cancel / Close button for Setup Modal */}
                        <div className="flex justify-center w-full mt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    triggerHaptic("light");
                                    closePinSetup();
                                }}
                                className="text-xs font-semibold text-(--text-tertiary) hover:text-(--text-primary) px-4 py-2 rounded-full hover:bg-white/10 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                {t("common.cancel")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
