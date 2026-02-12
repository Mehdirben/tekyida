"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, LogOut, Eye, EyeOff } from "lucide-react";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { useTranslation } from "@/i18n/LanguageContext";
import { useAuthActions } from "@convex-dev/auth/react";

export default function SettingsPage() {
    const { t } = useTranslation();
    const { signOut } = useAuthActions();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSignOut = async () => {
        await signOut();
        router.push("/login");
    };

    return (
        <main className="flex-1 px-4 sm:px-6 pt-6 pb-4 max-w-2xl mx-auto w-full">
            {/* Title */}
            <div className="mb-8 animate-slide-up">
                <h1 className="text-2xl font-extrabold tracking-tight">
                    <span className="gradient-text">{t("settings.title")}</span>
                </h1>
            </div>

            <div className="space-y-6">
                {/* Account Section */}
                <section className="liquid-glass-card p-6 animate-slide-up delay-100">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-(--text-tertiary) mb-5">
                        {t("settings.account")}
                    </h2>

                    <div className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 ml-1">
                                {t("settings.email")}
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
                                />
                            </div>
                        </div>

                        {/* New Password */}
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
                                    type={showNewPassword ? "text" : "password"}
                                    className="glass-input pl-10 pr-10"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary) hover:text-(--text-primary) transition-colors cursor-pointer"
                                >
                                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
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
                                    type={showConfirmPassword ? "text" : "password"}
                                    className="glass-input pl-10 pr-10"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary) hover:text-(--text-primary) transition-colors cursor-pointer"
                                >
                                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Save */}
                        <div className="pt-1">
                            <Button size="md">
                                {t("settings.save")}
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Appearance Section */}
                <section className="liquid-glass-card p-6 animate-slide-up delay-200">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-(--text-tertiary) mb-5">
                        {t("settings.appearance")}
                    </h2>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t("settings.appearance")}</span>
                        <ThemeToggle />
                    </div>
                </section>

                {/* Language Section */}
                <section className="liquid-glass-card p-6 animate-slide-up delay-300">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-(--text-tertiary) mb-5">
                        {t("settings.language")}
                    </h2>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t("settings.language")}</span>
                        <LanguageToggle />
                    </div>
                </section>

                {/* Sign Out Section */}
                <section className="liquid-glass-card p-6 animate-slide-up delay-400">
                    <Button
                        variant="danger"
                        size="md"
                        className="w-full"
                        onClick={handleSignOut}
                    >
                        <LogOut size={16} />
                        {t("settings.signOut")}
                    </Button>
                </section>
            </div>
        </main>
    );
}
