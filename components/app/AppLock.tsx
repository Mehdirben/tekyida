"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogOut } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useTranslation } from "@/i18n/LanguageContext";
import { hashPin } from "@/lib/crypto";
import { triggerHaptic } from "@/lib/haptics";
import PinPad from "@/components/ui/PinPad";

export default function AppLock({ children }: { children: React.ReactNode }) {
    const { t } = useTranslation();
    const router = useRouter();
    const { signOut } = useAuthActions();

    const [isLocked, setIsLocked] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("tekyida-lock-enabled") === "true";
        }
        return false;
    });
    const [pinValue, setPinValue] = useState("");
    const [isError, setIsError] = useState(false);
    const [hasBiometrics, setHasBiometrics] = useState(false);
    const hasTriggeredInitialBio = useRef(false);

    // Cryptographically trigger Face ID / Touch ID challenge
    const triggerBiometrics = async () => {
        const storedBioEnabled = localStorage.getItem("tekyida-lock-bio-enabled") === "true";
        if (!storedBioEnabled) return;

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        try {
            const credential = await navigator.credentials.get({
                publicKey: {
                    challenge,
                    rpId: window.location.hostname,
                    userVerification: "required",
                },
            });
            if (credential) {
                setIsLocked(false);
                setPinValue("");
                setIsError(false);
                triggerHaptic("medium");
            }
        } catch (error) {
            console.warn("Biometric unlock failed or dismissed:", error);
        }
    };

    // 1. Detect if browser supports biometrics and is running in standalone PWA mode
    useEffect(() => {
        const checkBioAvailability = async () => {
            const isPWA =
                window.matchMedia("(display-mode: standalone)").matches ||
                (window.navigator as unknown as { standalone?: boolean }).standalone === true;

            if (
                isPWA &&
                window.PublicKeyCredential &&
                await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
            ) {
                setHasBiometrics(true);
            }
        };
        void checkBioAvailability();
    }, []);

    // 2. Automatically prompt biometrics once initially when lock screen is visible
    useEffect(() => {
        const storedBioEnabled = localStorage.getItem("tekyida-lock-bio-enabled") === "true";
        if (isLocked && storedBioEnabled && hasBiometrics && !hasTriggeredInitialBio.current) {
            hasTriggeredInitialBio.current = true;
            // Delay slightly to allow the layout animation to settle
            const timer = setTimeout(() => {
                void triggerBiometrics();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isLocked, hasBiometrics]);

    // 3. Monitor visibility change to re-lock the app if closed/resume
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                const isLockEnabled = localStorage.getItem("tekyida-lock-enabled") === "true";
                if (isLockEnabled) {
                    setIsLocked(true);
                    setPinValue("");
                    hasTriggeredInitialBio.current = false; // Reset biometric trigger
                }
            } else if (document.visibilityState === "visible") {
                // If it becomes visible and is locked, trigger biometrics again
                const isLockEnabled = localStorage.getItem("tekyida-lock-enabled") === "true";
                const storedBioEnabled = localStorage.getItem("tekyida-lock-bio-enabled") === "true";
                if (isLockEnabled && storedBioEnabled && hasBiometrics) {
                    void triggerBiometrics();
                }
            }
        };

        const handleFocus = () => {
            const isLockEnabled = localStorage.getItem("tekyida-lock-enabled") === "true";
            const storedBioEnabled = localStorage.getItem("tekyida-lock-bio-enabled") === "true";
            if (isLockEnabled && storedBioEnabled && hasBiometrics && isLocked && !hasTriggeredInitialBio.current) {
                void triggerBiometrics();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleFocus);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", handleFocus);
        };
    }, [hasBiometrics, isLocked]);

    // 5. Verify the 6-digit PIN using SHA-256 local hash matching
    const handlePinComplete = async (enteredPin: string) => {
        const storedHash = localStorage.getItem("tekyida-lock-pin-hash");
        const storedSalt = localStorage.getItem("tekyida-lock-pin-salt");

        if (!storedHash || !storedSalt) {
            // Edge case: if disabled but state locked, bypass
            setIsLocked(false);
            return;
        }

        const computedHash = await hashPin(enteredPin, storedSalt);

        if (computedHash === storedHash) {
            triggerHaptic("medium");
            setIsLocked(false);
            setPinValue("");
            setIsError(false);
        } else {
            setIsError(true);
            setPinValue(""); // Reset input to let them try again
        }
    };

    // 6. Sign out bypass in case they forgot their PIN
    const handleSignOut = async () => {
        triggerHaptic("warning");
        const confirmed = window.confirm(t("settings.signOutConfirm"));
        if (!confirmed) return;

        try {
            localStorage.removeItem("tekyida-authed");
            localStorage.removeItem("tekyida-lock-enabled");
            localStorage.removeItem("tekyida-lock-bio-enabled");
            localStorage.removeItem("tekyida-lock-pin-hash");
            localStorage.removeItem("tekyida-lock-pin-salt");
        } catch {}

        await signOut();
        router.push("/login");
    };

    if (isLocked) {
        const isBioEnabled = localStorage.getItem("tekyida-lock-bio-enabled") === "true";

        return (
            <div 
                className="fixed inset-0 z-[1000] flex flex-col justify-between px-6 py-12 animate-fade-in border-b border-(--glass-border) shadow-2xl"
                style={{
                    background: "var(--glass-bg)",
                    backdropFilter: "blur(32px) saturate(2.2)",
                    WebkitBackdropFilter: "blur(32px) saturate(2.2)",
                }}
            >
                {/* Header */}
                <div className="flex flex-col items-center text-center mt-12 space-y-4">
                    <div className="relative p-4 rounded-3xl liquid-glass shadow-xl shadow-primary-950/15 dark:shadow-black/35 text-primary-500 dark:text-primary-400 animate-scale-in">
                        <Lock size={36} />
                    </div>
                    <div className="space-y-1.5">
                        <h1 className="text-xl font-extrabold tracking-tight">
                            <span className="gradient-text">{t("lock.title")}</span>
                        </h1>
                        <p className="text-xs font-medium text-(--text-tertiary) max-w-[280px] mx-auto leading-relaxed">
                            {isBioEnabled && hasBiometrics
                                ? t("lock.subtitle")
                                : t("lock.enterPin")}
                        </p>
                    </div>
                </div>

                {/* Keypad Pad Input */}
                <div className="flex-1 flex items-center justify-center my-6">
                    <PinPad
                        value={pinValue}
                        onChange={setPinValue}
                        onComplete={handlePinComplete}
                        error={isError}
                        onClearError={() => setIsError(false)}
                        showBiometricButton={isBioEnabled && hasBiometrics}
                        onBiometricClick={triggerBiometrics}
                        title={isError ? t("lock.invalidPin") : undefined}
                    />
                </div>

                {/* Footer Fallback */}
                <div className="flex justify-center mt-4">
                    <button
                        type="button"
                        onClick={handleSignOut}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-(--text-tertiary) hover:text-danger-500 dark:hover:text-danger-400 px-4 py-2 rounded-full hover:bg-white/10 dark:hover:bg-white/5 transition-all duration-200 cursor-pointer"
                    >
                        <LogOut size={14} />
                        {t("lock.signOut")}
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
