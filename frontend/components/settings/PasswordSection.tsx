"use client";

import { useState } from "react";
import { WifiOff, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSync } from "@/contexts/SyncContext";
import Button from "@/components/ui/Button";
import PasswordInput from "@/components/auth/PasswordInput";
import StatusBanner from "@/components/ui/StatusBanner";

export default function PasswordSection({ animateIn }: { animateIn: boolean }) {
    const { t } = useTranslation();
    const { isOnline } = useSync();
    const changePassword = useAction(api.users.changePassword);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState("");

    const handleChangePassword = async () => {
        setPasswordError("");
        setPasswordSuccess("");

        if (!currentPassword) {
            setPasswordError(t("settings.currentPasswordRequired"));
            return;
        }
        if (!newPassword || newPassword.length < 8) {
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

    return (
        <section className={`liquid-glass-card p-6 ${animateIn ? "animate-slide-up delay-150" : ""} relative`}>
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
                <PasswordInput
                    label={t("settings.currentPassword")}
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    disabled={!isOnline}
                    autoComplete="current-password"
                />
                <PasswordInput
                    label={t("settings.newPassword")}
                    value={newPassword}
                    onChange={setNewPassword}
                    disabled={!isOnline}
                    autoComplete="new-password"
                />
                <PasswordInput
                    label={t("settings.confirmPassword")}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    disabled={!isOnline}
                    autoComplete="new-password"
                />
                {passwordError && <StatusBanner variant="error" message={passwordError} />}
                {passwordSuccess && <StatusBanner variant="success" message={passwordSuccess} />}
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
    );
}
