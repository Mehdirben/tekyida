"use client";

import { useState } from "react";
import { WifiOff, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSync } from "@/contexts/SyncContext";
import Button from "@/components/ui/Button";
import EmailInput from "@/components/auth/EmailInput";
import StatusBanner from "@/components/ui/StatusBanner";

export default function EmailSection({ animateIn }: { animateIn: boolean }) {
    const { t } = useTranslation();
    const { isOnline } = useSync();
    const changeEmail = useAction(api.users.changeEmail);
    const currentEmailData = useQuery(api.users.currentEmail);

    const [email, setEmail] = useState("");
    const [confirmEmail, setConfirmEmail] = useState("");
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [emailSuccess, setEmailSuccess] = useState("");

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

    return (
        <section className={`liquid-glass-card p-6 ${animateIn ? "animate-slide-up delay-100" : ""} relative`}>
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
                <EmailInput
                    label={t("settings.newEmail")}
                    value={email}
                    onChange={setEmail}
                    disabled={!isOnline}
                />
                <EmailInput
                    label={t("settings.confirmEmail")}
                    value={confirmEmail}
                    onChange={setConfirmEmail}
                    disabled={!isOnline}
                />
                {emailError && <StatusBanner variant="error" message={emailError} />}
                {emailSuccess && <StatusBanner variant="success" message={emailSuccess} />}
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
    );
}
