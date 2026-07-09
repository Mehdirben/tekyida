"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import Button from "@/components/ui/Button";
import LanguageToggle from "@/components/ui/LanguageToggle";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useTranslation } from "@/i18n/LanguageContext";
import { triggerHaptic } from "@/lib/haptics";

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
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
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
        <>
            <div className="mesh-gradient" />

            <div className="relative z-20 min-h-screen flex flex-col items-center justify-center px-5 py-12">
                <div className="fixed top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50">
                    <LanguageToggle />
                    <ThemeToggle />
                </div>

                <div className="w-full max-w-md animate-scale-in">
                    <div className="liquid-glass-card p-8 sm:p-10 relative overflow-hidden">
                        <div className="absolute inset-0 glass-shimmer rounded-[1.25rem]" />

                        <div className="relative z-10">
                            <div className="flex justify-center mb-6">
                                <Link href="/">
                                    <Logo size="lg" showText={false} />
                                </Link>
                            </div>

                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center mb-2">
                                <span className="gradient-text">{t("auth.newPasswordTitle")}</span>
                            </h1>
                            <p className="text-sm text-(--text-secondary) text-center mb-8">
                                {t("auth.newPasswordSubtitle")}
                            </p>

                            {error && (
                                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 ml-1">
                                        {t("login.email")}
                                    </label>
                                    <div className="relative">
                                        <Mail
                                            size={16}
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary)"
                                        />
                                        <input
                                            type="email"
                                            className="glass-input pl-10"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 ml-1">
                                        {t("settings.newPassword")}
                                    </label>
                                    <div className="relative">
                                        <Lock
                                            size={16}
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary)"
                                        />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="glass-input pl-10 pr-10"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowPassword(!showPassword);
                                                triggerHaptic("selection");
                                            }}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary) hover:text-(--text-primary) transition-colors cursor-pointer"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 ml-1">
                                        {t("settings.confirmPassword")}
                                    </label>
                                    <div className="relative">
                                        <Lock
                                            size={16}
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary)"
                                        />
                                        <input
                                            type={showConfirm ? "text" : "password"}
                                            className="glass-input pl-10 pr-10"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowConfirm(!showConfirm);
                                                triggerHaptic("selection");
                                            }}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary) hover:text-(--text-primary) transition-colors cursor-pointer"
                                        >
                                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

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
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
