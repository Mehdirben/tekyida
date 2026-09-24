"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import LanguageToggle from "@/components/ui/LanguageToggle";
import ThemeToggle from "@/components/ui/ThemeToggle";

interface AuthShellProps {
    title: string;
    subtitle?: string;
    error?: string;
    notice?: string;
    children: ReactNode;
}

export default function AuthShell({
    title,
    subtitle,
    error,
    notice,
    children,
}: AuthShellProps) {
    return (
        <div className="relative min-h-[100dvh] flex flex-col justify-center items-center p-4">
            <div className="mesh-gradient" />

            {/* Offline badge in top bar */}
            <div className="safe-fixed-top fixed left-4 z-50 flex items-center gap-2">
                <div className="liquid-glass rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-accent-500">Active</span>
                </div>
            </div>

            {/* Page content */}
            <div className="auth-safe-page relative z-20 flex flex-col items-center justify-center">
                {/* Top-right controls */}
                <div className="safe-fixed-top fixed left-1/2 -translate-x-1/2 flex items-center gap-2 z-50">
                    <LanguageToggle />
                    <ThemeToggle />
                </div>

                {/* Main Card */}
                <div className="w-full max-w-md animate-scale-in">
                    <div className="liquid-glass-card p-8 sm:p-10 relative overflow-hidden">
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
                                <span className="gradient-text">{title}</span>
                            </h1>
                            {subtitle && (
                                <p className="text-sm text-(--text-secondary) text-center mb-8">
                                    {subtitle}
                                </p>
                            )}

                            {error && (
                                <div className="mb-4 p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-500 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            {notice && (
                                <div className="mb-4 p-3 rounded-xl bg-accent-500/10 border border-accent-500/20 text-accent-600 dark:text-accent-400 text-sm text-center">
                                    {notice}
                                </div>
                            )}

                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
