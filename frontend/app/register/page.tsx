"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import AuthShell from "@/components/auth/AuthShell";
import EmailVerificationForm from "@/components/auth/EmailVerificationForm";
import PasswordInput from "@/components/auth/PasswordInput";
import EmailInput from "@/components/auth/EmailInput";
import AuthSubmitButton from "@/components/auth/AuthSubmitButton";
import { useEmailVerification } from "@/components/auth/authHelpers";

export default function RegisterPage() {
    const { t } = useTranslation();
    const { signIn } = useAuthActions();
    const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [mode, setMode] = useState<"form" | "verify">("form");

    const {
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
    } = useEmailVerification(email);

    // Redirect if already authenticated
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.push("/app");
        }
    }, [isAuthenticated, authLoading, router]);

    if (authLoading || isAuthenticated) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setNotice("");

        if (password !== confirmPassword) {
            setError(t("register.passwordMismatch") || "Passwords do not match.");
            return;
        }

        if (password.length < 8) {
            setError(t("register.passwordTooShort") || "Password must be at least 8 characters.");
            return;
        }

        setLoading(true);

        try {
            const result = await signIn("password", { email, password, name, flow: "signUp" });
            if (!result.signingIn) {
                setMode("verify");
                setNotice(t("auth.verificationSent"));
            }
        } catch (err) {
            console.error("Registration failed:", err);
            const msg = err instanceof Error ? err.message : String(err);
            const lowerMsg = msg.toLowerCase();

            if (lowerMsg.includes("already exists") || lowerMsg.includes("useralreadyexists") || lowerMsg.includes("email already in use")) {
                setError(t("register.error.userExists") || "An account with this email already exists.");
            } else if (lowerMsg.includes("invalid email") || lowerMsg.includes("invalidemail")) {
                setError(t("register.error.invalidEmail") || "Please enter a valid email address.");
            } else if (lowerMsg.includes("password too short") || lowerMsg.includes("passwordtooshort") || lowerMsg.includes("invalid password")) {
                setError(t("register.error.passwordTooShort") || "Password must be at least 8 characters.");
            } else {
                setError(t("register.error") || "Registration failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title={mode === "verify" ? t("auth.verifyEmail") : t("register.title")}
            subtitle={mode === "verify" ? t("auth.enterCode") : t("register.subtitle")}
            error={error}
            notice={notice}
        >
            {mode === "verify" ? (
                <EmailVerificationForm
                    email={email}
                    code={code}
                    loading={loading}
                    onCodeChange={setCode}
                    onSubmit={handleVerify}
                    onResendCode={handleResendCode}
                />
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 ml-1">
                            {t("register.name")}
                        </label>
                        <div className="relative">
                            <User
                                size={16}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary)"
                            />
                            <input
                                type="text"
                                className="glass-input pl-10"
                                placeholder="Ahmed Karim"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <EmailInput
                        label={t("register.email")}
                        value={email}
                        onChange={setEmail}
                        disabled={loading}
                    />

                    <PasswordInput
                        id="register-password"
                        label={t("register.password")}
                        value={password}
                        onChange={setPassword}
                        disabled={loading}
                        autoComplete="new-password"
                    />

                    <PasswordInput
                        id="register-confirm-password"
                        label={t("register.confirmPassword")}
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        disabled={loading}
                        autoComplete="new-password"
                    />

                    <AuthSubmitButton loading={loading} label={t("register.submit")} />
                </form>
            )}

            <p className="text-center text-sm text-(--text-secondary) mt-6">
                {t("register.hasAccount")}{" "}
                <Link
                    href="/login"
                    className="text-primary-500 hover:text-primary-400 font-semibold transition-colors"
                >
                    {t("register.login")}
                </Link>
            </p>
        </AuthShell>
    );
}
