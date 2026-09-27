"use client";

import { useState, type FormEvent } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useTranslation } from "@/i18n/LanguageContext";

type PasswordSignIn = (
    provider: string,
    params?: { email: string; code?: string; flow: "email-verification" }
) => Promise<unknown>;

async function verifyEmailCode(
    signIn: PasswordSignIn,
    email: string,
    code: string
): Promise<void> {
    await signIn("password", {
        email,
        code: code.trim(),
        flow: "email-verification",
    });
}

async function resendVerificationCode(
    signIn: PasswordSignIn,
    email: string
): Promise<void> {
    await signIn("password", { email, flow: "email-verification" });
}

export function useEmailVerification(email: string) {
    const { t } = useTranslation();
    const { signIn } = useAuthActions();
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [loading, setLoading] = useState(false);

    const handleVerify = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setNotice("");
        setLoading(true);

        try {
            await verifyEmailCode(signIn, email, code);
        } catch (err) {
            console.error("Email verification failed:", err);
            setError(t("auth.invalidCode"));
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setError("");
        setNotice("");
        setLoading(true);

        try {
            await resendVerificationCode(signIn, email);
            setNotice(t("auth.verificationSent"));
        } catch (err) {
            console.error("Verification resend failed:", err);
            setError(t("auth.resendError"));
        } finally {
            setLoading(false);
        }
    };

    return {
        code,
        setCode,
        error,
        setError,
        notice,
        setNotice,
        loading,
        setLoading,
        handleVerify,
        handleResendCode,
    };
}
