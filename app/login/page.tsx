"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";
import { useTranslation } from "@/i18n/LanguageContext";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

export default function LoginPage() {
    const { t } = useTranslation();
    const { signIn } = useAuthActions();
    const { isAuthenticated } = useConvexAuth();
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Redirect once Convex auth state confirms authentication
    useEffect(() => {
        if (isAuthenticated) {
            router.push("/app");
        }
    }, [isAuthenticated, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await signIn("password", { email, password, flow: "signIn" });
            // Redirect handled by useEffect when isAuthenticated becomes true
        } catch {
            setError(t("login.error") || "Invalid email or password.");
            setLoading(false);
        }
    };

    return (
        <>
            {/* Mesh gradient background */}
            <div className="mesh-gradient" />

            {/* Floating decorative cards */}
            <div
                className="hidden lg:block fixed top-24 left-8 xl:left-20 liquid-glass-card p-4 w-48 animate-float z-10 pointer-events-none"
                style={{ "--float-rotate": "-4deg" } as React.CSSProperties}
            >
                <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-6 h-6 rounded-lg bg-accent-500/20 flex items-center justify-center">
                        <span className="text-xs">🔒</span>
                    </div>
                    <span className="text-[10px] font-semibold text-(--text-secondary)">Secure Login</span>
                </div>
                <div className="space-y-1.5">
                    <div className="h-2 rounded-full bg-white/20 dark:bg-white/5 w-full" />
                    <div className="h-2 rounded-full bg-white/20 dark:bg-white/5 w-3/4" />
                    <div className="h-2 rounded-full bg-primary-500/20 w-1/2" />
                </div>
            </div>

            <div
                className="hidden lg:block fixed bottom-32 right-8 xl:right-20 liquid-glass-card p-4 w-52 animate-float-alt z-10 pointer-events-none"
                style={{ "--float-rotate": "3deg" } as React.CSSProperties}
            >
                <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-full bg-primary-500/15 flex items-center justify-center text-xs font-bold text-primary-600 dark:text-primary-300">
                        T
                    </div>
                    <div>
                        <p className="text-xs font-semibold">Tekyida</p>
                        <p className="text-[9px] text-(--text-tertiary)">IOU Tracker</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-1">
                    {["📒 Carnets", "💰 MAD", "☁️ Sync"].map((tag) => (
                        <span
                            key={tag}
                            className="text-[9px] font-medium px-2 py-0.5 rounded-full liquid-glass text-(--text-secondary)"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            <div
                className="hidden lg:block fixed top-40 right-10 xl:right-24 liquid-glass-card p-3 w-44 animate-float z-10 pointer-events-none"
                style={{ "--float-rotate": "2deg" } as React.CSSProperties}
            >
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-gold-500/20 flex items-center justify-center">
                        <span className="text-[9px]">✨</span>
                    </div>
                    <span className="text-[10px] font-semibold text-(--text-secondary)">Welcome back!</span>
                </div>
                <div className="liquid-glass rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                    <span className="text-[9px] text-(--text-tertiary) uppercase tracking-wider font-medium">Status</span>
                    <span className="text-[10px] font-bold text-accent-500">Active</span>
                </div>
            </div>

            {/* Page content */}
            <div className="relative z-20 min-h-screen flex flex-col items-center justify-center px-5 py-12">
                {/* Top-right controls */}
                <div className="fixed top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50">
                    <LanguageToggle />
                    <ThemeToggle />
                </div>

                {/* Login Card */}
                <div className="w-full max-w-md animate-scale-in">
                    <div className="liquid-glass-card p-8 sm:p-10 relative overflow-hidden">
                        {/* Shimmer */}
                        <div className="absolute inset-0 glass-shimmer rounded-[1.25rem]" />

                        <div className="relative z-10">
                            {/* Logo */}
                            <div className="flex justify-center mb-6">
                                <Link href="/">
                                    <Logo size="lg" showText={false} />
                                </Link>
                            </div>

                            {/* Heading */}
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center mb-2">
                                <span className="gradient-text">{t("login.title")}</span>
                            </h1>
                            <p className="text-sm text-(--text-secondary) text-center mb-8">
                                {t("login.subtitle")}
                            </p>

                            {/* Error message */}
                            {error && (
                                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            {/* Form */}
                            <form
                                onSubmit={handleSubmit}
                                className="space-y-4"
                            >
                                {/* Email */}
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
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5 ml-1">
                                        <label className="block text-xs font-semibold text-(--text-secondary)">
                                            {t("login.password")}
                                        </label>
                                        <button
                                            type="button"
                                            className="text-[11px] text-primary-500 hover:text-primary-400 font-medium transition-colors cursor-pointer"
                                        >
                                            {t("login.forgotPassword")}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Lock
                                            size={16}
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary)"
                                        />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="glass-input pl-10 pr-10"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary) hover:text-(--text-primary) transition-colors cursor-pointer"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Submit */}
                                <div className="pt-2">
                                    <Button size="lg" className="w-full" disabled={loading}>
                                        {loading ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <>
                                                {t("login.submit")}
                                                <ArrowRight size={16} />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>

                            {/* Register link */}
                            <p className="text-center text-sm text-(--text-secondary) mt-6">
                                {t("login.noAccount")}{" "}
                                <Link
                                    href="/register"
                                    className="text-primary-500 hover:text-primary-400 font-semibold transition-colors"
                                >
                                    {t("login.register")}
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
