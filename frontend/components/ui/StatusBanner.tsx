"use client";

import { CheckCircle } from "lucide-react";

interface StatusBannerProps {
    variant: "error" | "success";
    message: string;
    textSize?: "sm" | "xs";
    className?: string;
}

export default function StatusBanner({
    variant,
    message,
    textSize = "sm",
    className = "",
}: StatusBannerProps) {
    const isError = variant === "error";
    const palette = isError
        ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
        : "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400";

    if (isError) {
        return (
            <div className={`p-3 rounded-xl border ${palette} ${textSize === "xs" ? "text-xs" : "text-sm"} text-center ${className}`}>
                {message}
            </div>
        );
    }

    return (
        <div className={`p-3 rounded-xl border ${palette} ${textSize === "xs" ? "text-xs" : "text-sm"} text-center flex items-center justify-center gap-2 ${className}`}>
            <CheckCircle size={14} />
            {message}
        </div>
    );
}
