"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/i18n/LanguageContext";
import AuthShell from "@/components/auth/AuthShell";
import PasswordInput from "@/components/auth/PasswordInput";

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordForm />
        </Suspense>
    );
}

function ResetPasswordForm() {
    const { t } = useTranslation();
    const { signIn, signOut } = useAuthActions();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
    const [token] = useState(() => searchParams.get("token") ?? "");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError("");

        if (!email || !token) {
            setError(t("auth.invalidResetLink"));
            return;
        }

        if (newPassword.length < 8) {
            setError(t("register.passwordTooShort"));
            return;
        }

        if (newPassword !== confirmPassword) {
            setError(t("auth.resetPasswordMismatch"));
            return;
        }

        setLoading(true);

        try {
            await signIn("password", {
                email,
                code: token,
                newPassword,
                flow: "reset-verification",
            });
            await signOut().catch(() => {});
            try { localStorage.removeItem("tekyida-authed"); } catch {}
            router.push("/login?reset=success");
        } catch (err) {
            console.error("Password reset failed:", err);
            setError(t("auth.invalidResetLink"));
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title={t("auth.newPasswordTitle")}
            subtitle={t("auth.newPasswordSubtitle")}
            error={error}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 ml-1">
                        {t("login.email")}
                    </label>
                    <input
                        type="email"
                        className="glass-input pl-4"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                    />
                </div>

                <PasswordInput
                    id="reset-new-password"
                    label={t("settings.newPassword")}
                    value={newPassword}
                    onChange={setNewPassword}
                    disabled={loading}
                    autoComplete="new-password"
                />

                <PasswordInput
                    id="reset-confirm-password"
                    label={t("settings.confirmPassword")}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    disabled={loading}
                    autoComplete="new-password"
                />

                <Button size="lg" className="w-full" disabled={loading || !token}>
                    {loading ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <>
                            {t("auth.updatePassword")}
                            <ArrowRight size={16} />
                        </>
                    )}
                </Button>
            </form>
        </AuthShell>
    );
}
