"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/i18n/LanguageContext";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import AuthShell from "@/components/auth/AuthShell";
import EmailVerificationForm from "@/components/auth/EmailVerificationForm";
import PasswordInput from "@/components/auth/PasswordInput";
import EmailInput from "@/components/auth/EmailInput";
import AuthSubmitButton from "@/components/auth/AuthSubmitButton";
import { useEmailVerification } from "@/components/auth/authHelpers";

export default function LoginPage() {
    const { t } = useTranslation();
    const { signIn } = useAuthActions();
    const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [mode, setMode] = useState<"signIn" | "verify" | "forgot" | "resetSent">("signIn");

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

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("reset") === "success") {
            setNotice(t("auth.resetSuccess"));
            window.history.replaceState({}, "", "/login");
        }
    }, [t]);

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
        setLoading(true);

        try {
            const result = await signIn("password", { email, password, flow: "signIn" });
            if (!result.signingIn) {
                setMode("verify");
                setNotice(t("auth.verificationSent"));
            }
        } catch (err) {
            console.error("Login failed:", err);
            const msg = err instanceof Error ? err.message : String(err);
            const lowerMsg = msg.toLowerCase();

            if (
                lowerMsg.includes("invalidpassword") ||
                lowerMsg.includes("invalid-password") ||
                lowerMsg.includes("incorrect password") ||
                lowerMsg.includes("invalid password")
            ) {
                setError(t("login.error.invalidPassword") || "Incorrect password. Please try again.");
            } else if (lowerMsg.includes("no account") || lowerMsg.includes("usernotfound") || lowerMsg.includes("user-not-found")) {
                setError(t("login.error.userNotFound") || "No account found with this email.");
            } else if (lowerMsg.includes("invalid email") || lowerMsg.includes("invalidemail")) {
                setError(t("login.error.invalidEmail") || "Please enter a valid email address.");
            } else {
                setError(t("login.error") || "Invalid email or password.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setNotice("");
        setLoading(true);

        try {
            await signIn("password", { email, flow: "reset" });
            setMode("resetSent");
            setNotice(t("auth.resetLinkSent"));
        } catch (err) {
            console.error("Forgot password failed:", err);
            setError(t("login.error"));
        } finally {
            setLoading(false);
        }
    };

    const title =
        mode === "verify"
            ? t("auth.verifyEmail")
            : mode === "forgot"
            ? t("auth.resetTitle")
            : mode === "resetSent"
            ? t("auth.resetTitle")
            : t("login.title");

    const subtitle =
        mode === "verify"
            ? t("auth.enterCode")
            : mode === "forgot"
            ? t("auth.resetSubtitle")
            : mode === "resetSent"
            ? t("auth.resetLinkSent")
            : t("login.subtitle");

    return (
        <AuthShell title={title} subtitle={subtitle} error={error} notice={notice}>
            {mode === "verify" ? (
                <EmailVerificationForm
                    email={email}
                    code={code}
                    loading={loading}
                    onCodeChange={setCode}
                    onSubmit={handleVerify}
                    onResendCode={handleResendCode}
                />
            ) : mode === "forgot" ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                    <EmailInput
                        label={t("login.email")}
                        value={email}
                        onChange={setEmail}
                        disabled={loading}
                    />
                    <Button size="lg" className="w-full" disabled={loading}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : t("auth.sendResetLink")}
                    </Button>
                    <button
                        type="button"
                        onClick={() => {
                            setMode("signIn");
                            setError("");
                            setNotice("");
                        }}
                        className="w-full text-sm text-primary-500 hover:text-primary-400 font-semibold transition-colors"
                    >
                        {t("auth.backToLogin")}
                    </button>
                </form>
            ) : mode === "resetSent" ? (
                <div className="space-y-4">
                    <Button
                        type="button"
                        size="lg"
                        className="w-full"
                        onClick={() => {
                            setMode("signIn");
                            setNotice("");
                        }}
                    >
                        {t("auth.backToLogin")}
                    </Button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <EmailInput
                        label={t("login.email")}
                        value={email}
                        onChange={setEmail}
                        disabled={loading}
                    />

                    <div>
                        <div className="flex items-center justify-between mb-1.5 ml-1">
                            <label className="block text-xs font-semibold text-(--text-secondary)">
                                {t("login.password")}
                            </label>
                            <button
                                type="button"
                                onClick={() => {
                                    setMode("forgot");
                                    setError("");
                                    setNotice("");
                                }}
                                className="text-xs text-primary-500 hover:text-primary-400 font-semibold transition-colors"
                            >
                                {t("login.forgotPassword")}
                            </button>
                        </div>
                        <PasswordInput
                            label=""
                            value={password}
                            onChange={setPassword}
                            disabled={loading}
                        />
                    </div>

                    <AuthSubmitButton loading={loading} label={t("login.submit")} />
                </form>
            )}

            <p className="text-center text-sm text-(--text-secondary) mt-6">
                {t("login.noAccount")}{" "}
                <Link
                    href="/register"
                    className="text-primary-500 hover:text-primary-400 font-semibold transition-colors"
                >
                    {t("login.register")}
                </Link>
            </p>
        </AuthShell>
    );
}
