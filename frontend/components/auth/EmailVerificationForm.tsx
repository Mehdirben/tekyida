"use client";

import type { FormEvent } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/i18n/LanguageContext";

interface EmailVerificationFormProps {
    email: string;
    code: string;
    loading: boolean;
    onCodeChange: (code: string) => void;
    onSubmit: (e: FormEvent) => void;
    onResendCode: () => void;
}

export default function EmailVerificationForm({
    email,
    code,
    loading,
    onCodeChange,
    onSubmit,
    onResendCode,
}: EmailVerificationFormProps) {
    const { t } = useTranslation();

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex justify-center mb-2">
                <div className="w-12 h-12 rounded-full bg-primary-500/15 flex items-center justify-center text-primary-500">
                    <ShieldCheck size={22} />
                </div>
            </div>
            <p className="text-sm text-(--text-secondary) text-center">
                {t("auth.enterCode")} <span className="font-semibold text-(--text-primary)">{email}</span>
            </p>
            <div>
                <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 ml-1">
                    {t("auth.code")}
                </label>
                <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="glass-input text-center text-xl font-bold tracking-[0.35em]"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    disabled={loading}
                />
            </div>
            <Button size="lg" className="w-full" disabled={loading || code.length !== 6}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : t("auth.verifyEmail")}
            </Button>
            <button
                type="button"
                onClick={onResendCode}
                disabled={loading}
                className="w-full text-sm text-primary-500 hover:text-primary-400 font-semibold transition-colors disabled:opacity-50"
            >
                {t("auth.resendCode")}
            </button>
        </form>
    );
}
