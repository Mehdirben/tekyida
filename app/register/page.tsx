"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, Lock, Eye, EyeOff, User, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";
import { useTranslation } from "@/i18n/LanguageContext";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

export default function RegisterPage() {
    const { t } = useTranslation();
    const { signIn } = useAuthActions();
    const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Redirect if already authenticated
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.push("/app");
        }
    }, [isAuthenticated, authLoading, router]);

    // Don't render form while checking auth or if already authenticated
    if (authLoading || isAuthenticated) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError(t("register.passwordMismatch") || "Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            setError(t("register.passwordTooShort") || "Password must be at least 6 characters.");
            return;
        }

        setLoading(true);

        try {
            await signIn("password", { email, password, name, flow: "signUp" });
            // Redirect handled by useEffect when isAuthenticated becomes true
        } catch {
            setError(t("register.error") || "Registration failed. Please try again.");
            setLoading(false);
        }
    };

    return (
        <>
            {/* Mesh gradient background */}
            <div className="mesh-gradient" />

            {/* Floating decorative cards */}
            <div
                className="hidden lg:block fixed top-28 left-8 xl:left-20 liquid-glass-card p-4 w-52 animate-float z-10 pointer-events-none"
                style={{ "--float-rotate": "-3deg" } as React.CSSProperties}
            >
                <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-6 h-6 rounded-lg bg-primary-500/20 flex items-center justify-center">
                        <span className="text-xs">🚀</span>
                    </div>
                    <span className="text-[10px] font-semibold text-(--text-secondary)">Getting Started</span>
                </div>
                <div className="space-y-2">
                    {[
                        { step: "1", label: "Create account", done: true },
                        { step: "2", label: "Add notebook", done: false },
                        { step: "3", label: "Track IOUs", done: false },
                    ].map((item) => (
                        <div key={item.step} className="flex items-center gap-2">
                            <div
                                className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[8px] font-bold ${item.done
                                    ? "bg-accent-500/30 text-accent-500"
                                    : "bg-white/15 dark:bg-white/5 text-(--text-tertiary)"
                                    }`}
                            >
                                {item.done ? "✓" : item.step}
                            </div>
                            <span
                                className={`text-[10px] ${item.done ? "text-(--text-primary) font-medium" : "text-(--text-tertiary)"
                                    }`}
                            >
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div
                className="hidden lg:block fixed bottom-28 right-8 xl:right-20 liquid-glass-card p-4 w-48 animate-float-alt z-10 pointer-events-none"
                style={{ "--float-rotate": "3deg" } as React.CSSProperties}
            >
                <p className="text-[10px] font-semibold mb-2.5">Features</p>
                <div className="flex flex-wrap gap-1.5">
                    {["🇫🇷 FR/EN", "☁️ Cloud", "📱 PWA", "🔒 Auth", "💰 MAD"].map((feat) => (
                        <span
                            key={feat}
                            className="text-[9px] font-medium px-2 py-0.5 rounded-full liquid-glass text-(--text-secondary)"
                        >
                            {feat}
                        </span>
                    ))}
                </div>
            </div>

            <div
                className="hidden lg:block fixed top-44 right-10 xl:right-24 liquid-glass-card p-3 w-44 animate-float z-10 pointer-events-none"
                style={{ "--float-rotate": "2.5deg" } as React.CSSProperties}
            >
                <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-7 h-7 rounded-full bg-gold-500/15 flex items-center justify-center text-[10px] font-bold text-gold-600 dark:text-gold-400">
                        +
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold">New Member</p>
                        <p className="text-[8px] text-(--text-tertiary)">Join 1,200+ users</p>
                    </div>
                </div>
                <div className="liquid-glass rounded-lg px-2.5 py-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] text-(--text-tertiary) uppercase tracking-wider font-medium">Plan</span>
                        <span className="text-[10px] font-bold text-accent-500">Free</span>
                    </div>
                </div>
            </div>

            {/* Page content */}
            <div className="relative z-20 min-h-screen flex flex-col items-center justify-start sm:justify-center px-5 pt-24 pb-12">
                {/* Top-right controls */}
                <div className="fixed top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50">
                    <LanguageToggle />
                    <ThemeToggle />
                </div>

                {/* Register Card */}
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
                                <span className="gradient-text">{t("register.title")}</span>
                            </h1>
                            <p className="text-sm text-(--text-secondary) text-center mb-8">
                                {t("register.subtitle")}
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
                                {/* Name */}
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

                                {/* Email */}
                                <div>
                                    <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 ml-1">
                                        {t("register.email")}
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
                                    <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 ml-1">
                                        {t("register.password")}
                                    </label>
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

                                {/* Confirm Password */}
                                <div>
                                    <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 ml-1">
                                        {t("register.confirmPassword")}
                                    </label>
                                    <div className="relative">
                                        <Lock
                                            size={16}
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary)"
                                        />
                                        <input
                                            type={showConfirm ? "text" : "password"}
                                            className="glass-input pl-10 pr-10"
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary) hover:text-(--text-primary) transition-colors cursor-pointer"
                                        >
                                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
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
                                                {t("register.submit")}
                                                <ArrowRight size={16} />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>

                            {/* Login link */}
                            <p className="text-center text-sm text-(--text-secondary) mt-6">
                                {t("register.hasAccount")}{" "}
                                <Link
                                    href="/login"
                                    className="text-primary-500 hover:text-primary-400 font-semibold transition-colors"
                                >
                                    {t("register.login")}
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
