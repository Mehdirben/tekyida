"use client";

import { type ButtonHTMLAttributes, type MouseEvent, forwardRef } from "react";
import { triggerHaptic } from "@/lib/haptics";

type Variant = "primary" | "glass" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    haptic?: boolean;
    children: React.ReactNode;
}

const variantHapticPatterns: Record<Variant, "medium" | "light" | "selection" | "warning"> = {
    primary: "medium",
    glass: "light",
    ghost: "selection",
    danger: "warning",
};

const variantClasses: Record<Variant, string> = {
    primary:
        "bg-primary-800/90 dark:bg-primary-500/80 text-white backdrop-blur-md border border-primary-700/50 dark:border-primary-400/30 hover:bg-primary-700/90 dark:hover:bg-primary-400/80 shadow-lg shadow-primary-900/15 dark:shadow-primary-500/15 hover:shadow-xl transition-all duration-200",
    glass:
        "glass-btn text-(--text-primary) transition-all duration-200",
    ghost:
        "bg-transparent text-(--text-secondary) hover:text-(--text-primary) hover:bg-white/15 dark:hover:bg-white/5 transition-all duration-200",
    danger:
        "bg-danger-500/85 text-white backdrop-blur-md border border-danger-500/40 hover:bg-danger-500/95 transition-all duration-200",
};

const sizeClasses: Record<Size, string> = {
    sm: "px-4 py-2 text-sm rounded-full",
    md: "px-6 py-2.5 text-sm rounded-full",
    lg: "px-8 py-3.5 text-base rounded-full",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = "primary", size = "md", className = "", haptic = true, children, onClick, disabled, ...props }, ref) => {
        const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
            onClick?.(event);

            if (!haptic || disabled || event.defaultPrevented) {
                return;
            }

            triggerHaptic(variantHapticPatterns[variant]);
        };

        return (
            <button
                ref={ref}
                className={`inline-flex items-center justify-center gap-2 font-semibold cursor-pointer ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
                disabled={disabled}
                onClick={handleClick}
                {...props}
            >
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";
export default Button;
