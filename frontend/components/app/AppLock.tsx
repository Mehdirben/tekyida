"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogOut } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useTranslation } from "@/i18n/LanguageContext";
import { triggerHaptic } from "@/lib/haptics";
import { isLockEnabled, getStoredPinCredentials, verifyPin, clearPinStorage } from "@/lib/pinStorage";
import PinPad from "@/components/ui/PinPad";

export default function AppLock({ children }: { children: React.ReactNode }) {
    const { t } = useTranslation();
    const router = useRouter();
    const { signOut } = useAuthActions();

    const [isLocked, setIsLocked] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isClosingLock, setIsClosingLock] = useState(false);
    const [pinValue, setPinValue] = useState("");
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
        if (isLockEnabled()) {
            setIsLocked(true);
        }
    }, []);

    // Monitor visibility change to re-lock the app if closed/resumed
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                if (isLockEnabled()) {
                    setIsLocked(true);
                    setPinValue("");
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    // 5. Verify the 6-digit PIN using SHA-256 local hash matching
    const handlePinComplete = async (enteredPin: string) => {
        if (!getStoredPinCredentials()) {
            // Edge case: if disabled but state locked, bypass
            setIsLocked(false);
            return;
        }

        if (await verifyPin(enteredPin)) {
            triggerHaptic("medium");
            setIsClosingLock(true);
            setTimeout(() => {
                setIsLocked(false);
                setPinValue("");
                setIsError(false);
                setIsClosingLock(false);
            }, 300);
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
        } catch {}
        clearPinStorage();

        await signOut();
        router.push("/login");
    };

    if (!mounted) {
        return <>{children}</>;
    }

    if (isLocked) {
        return (
            <div 
                className={`safe-dialog fixed inset-0 z-[1000] flex flex-col items-center justify-center border-b border-(--glass-border) shadow-2xl overflow-y-auto ${
                    isClosingLock ? "animate-fade-out" : "animate-fade-in"
                }`}
                style={{
                    background: "var(--glass-bg)",
                    backdropFilter: "blur(32px) saturate(2.2)",
                    WebkitBackdropFilter: "blur(32px) saturate(2.2)",
                    transform: "translate3d(0, 0, 0)",
                    backfaceVisibility: "hidden",
                }}
            >
                {/* Unified Lock Block */}
                <div 
                    className={`w-full max-w-sm flex flex-col items-center space-y-8 my-auto ${
                        isClosingLock ? "animate-scale-out" : "animate-scale-in"
                    }`}
                >
                    {/* Header */}
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="relative p-3.5 rounded-2xl liquid-glass shadow-xl shadow-primary-950/15 dark:shadow-black/35 text-primary-500 dark:text-primary-400 animate-scale-in">
                            <Lock size={32} />
                        </div>
                        <div className="space-y-1.5">
                            <h1 className="text-xl font-extrabold tracking-tight">
                                <span className="gradient-text">{t("lock.title")}</span>
                            </h1>
                            <p className="text-xs font-semibold text-(--text-tertiary) max-w-[280px] mx-auto leading-relaxed">
                                {t("lock.enterPin")}
                            </p>
                        </div>
                    </div>

                    {/* Keypad Pad Input */}
                    <div className="w-full flex items-center justify-center">
                        <PinPad
                            value={pinValue}
                            onChange={setPinValue}
                            onComplete={handlePinComplete}
                            error={isError}
                            onClearError={() => setIsError(false)}
                            title={isError ? t("lock.invalidPin") : undefined}
                        />
                    </div>

                    {/* Footer Fallback */}
                    <div className="pt-2 flex justify-center w-full">
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
            </div>
        );
    }

    return <>{children}</>;
}
