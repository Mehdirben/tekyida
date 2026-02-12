"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    children: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
    primary:
        "gradient-btn text-white shadow-lg hover:shadow-xl",
    secondary:
        "bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-hover)] transition-all duration-200",
    ghost:
        "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all duration-200",
    danger:
        "bg-danger-500 text-white hover:bg-danger-600 transition-all duration-200 shadow-lg",
};

const sizeClasses: Record<Size, string> = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-5 py-2.5 text-sm rounded-xl",
    lg: "px-7 py-3.5 text-base rounded-xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={`inline-flex items-center justify-center gap-2 font-semibold cursor-pointer ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
                {...props}
            >
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";
export default Button;
