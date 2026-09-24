import { type HTMLAttributes, forwardRef } from "react";

type BadgeVariant = "default" | "success" | "danger" | "primary" | "gold";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
    children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
    default:
        "liquid-glass text-(--text-secondary)",
    success:
        "bg-accent-500/15 text-accent-600 dark:text-accent-400 border border-accent-500/20 backdrop-blur-md",
    danger:
        "bg-danger-500/15 text-danger-600 dark:text-danger-400 border border-danger-500/20 backdrop-blur-md",
    primary:
        "bg-primary-500/12 text-primary-700 dark:text-primary-300 border border-primary-500/20 backdrop-blur-md",
    gold:
        "bg-gold-500/12 text-gold-600 dark:text-gold-400 border border-gold-500/20 backdrop-blur-md",
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
    ({ variant = "default", className = "", children, ...props }, ref) => {
        return (
            <span
                ref={ref}
                className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${variantClasses[variant]} ${className}`}
                {...props}
            >
                {children}
            </span>
        );
    }
);

Badge.displayName = "Badge";
export default Badge;
