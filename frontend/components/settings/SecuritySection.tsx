"use client";

import { useState, useCallback } from "react";
import { Shield } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import Button from "@/components/ui/Button";
import PinPad from "@/components/ui/PinPad";
import StatusBanner from "@/components/ui/StatusBanner";
import { triggerHaptic } from "@/lib/haptics";
import { isLockEnabled, getStoredPinCredentials, verifyPin, savePin, clearPinStorage } from "@/lib/pinStorage";
import { useEscapeCascade } from "@/hooks/useEscapeCascade";

type PinFlow =
    | "setup"
    | "confirm"
    | "verify_disable"
    | "verify_change"
    | "change_new"
    | "change_confirm"
    | null;

export default function SecuritySection({ animateIn }: { animateIn: boolean }) {
    const { t } = useTranslation();

    const [lockEnabled, setLockEnabled] = useState(false);
    const [showPinSetup, setShowPinSetup] = useState<PinFlow>(null);
    const [isClosingModal, setIsClosingModal] = useState(false);
    const [setupPin, setSetupPin] = useState("");
    const [modalPin, setModalPin] = useState("");
    const [modalError, setModalError] = useState(false);
    const [securitySuccess, setSecuritySuccess] = useState("");

    const closePinSetup = useCallback(() => {
        setIsClosingModal(true);
        setTimeout(() => {
            setShowPinSetup(null);
            setIsClosingModal(false);
        }, 250); // Matches .animate-scale-out duration (250ms)
    }, []);

    useEscapeCascade(() => {
        if (showPinSetup && !isClosingModal) {
            triggerHaptic("light");
            closePinSetup();
        }
    });

    const showSecuritySuccess = () => {
        setSecuritySuccess(t("lock.pinSuccess"));
        setTimeout(() => setSecuritySuccess(""), 4000);
    };

    const handleLockToggleClick = () => {
        triggerHaptic("selection");
        if (isLockEnabled()) {
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

    const handlePinComplete = async (enteredPin: string) => {
        if (showPinSetup === "setup") {
            setSetupPin(enteredPin);
            setModalPin("");
            setShowPinSetup("confirm");
            triggerHaptic("medium");
        } else if (showPinSetup === "confirm") {
            if (enteredPin === setupPin) {
                await savePin(enteredPin);
                setLockEnabled(true);
                setModalPin("");
                triggerHaptic("medium");

                closePinSetup();
                showSecuritySuccess();
            } else {
                setModalError(true);
                setModalPin("");
            }
        } else if (showPinSetup === "verify_disable" || showPinSetup === "verify_change") {
            if (!getStoredPinCredentials()) {
                closePinSetup();
                return;
            }
            const correct = await verifyPin(enteredPin);
            if (correct) {
                if (showPinSetup === "verify_disable") {
                    clearPinStorage();
                    setLockEnabled(false);
                    closePinSetup();
                    setModalPin("");
                    triggerHaptic("medium");
                } else {
                    setSetupPin("");
                    setModalPin("");
                    setShowPinSetup("change_new");
                    triggerHaptic("medium");
                }
            } else {
                setModalError(true);
                setModalPin("");
            }
        } else if (showPinSetup === "change_new") {
            setSetupPin(enteredPin);
            setModalPin("");
            setShowPinSetup("change_confirm");
            triggerHaptic("medium");
        } else if (showPinSetup === "change_confirm") {
            if (enteredPin === setupPin) {
                await savePin(enteredPin);
                closePinSetup();
                setModalPin("");
                triggerHaptic("medium");
                showSecuritySuccess();
            } else {
                setModalError(true);
                setModalPin("");
            }
        }
    };

    return (
        <>
            <section className={`liquid-glass-card p-6 ${animateIn ? "animate-slide-up delay-175" : ""}`}>
                <h2 className="text-center sm:text-left text-sm font-bold uppercase tracking-wider text-(--text-tertiary) mb-5">
                    {t("settings.security")}
                </h2>

                {securitySuccess && (
                    <StatusBanner variant="success" message={securitySuccess} textSize="xs" className="mb-4" />
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
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center cursor-pointer rounded-full p-[3px] transition-colors duration-200 ease-in-out focus:outline-none ${
                                lockEnabled ? "bg-primary-500" : "bg-(--text-tertiary)/25"
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                    lockEnabled ? "translate-x-5" : "translate-x-0"
                                }`}
                            />
                        </button>
                    </div>

                    {lockEnabled && (
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

            {/* PIN Setup & Verify Overlay Modal */}
            {showPinSetup && (
                <div
                    className={`safe-dialog fixed inset-0 z-[1000] flex items-center justify-center bg-black/10 dark:bg-black/30 backdrop-blur-md ${
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
        </>
    );
}
