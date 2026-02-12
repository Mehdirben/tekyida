import { type HTMLAttributes, forwardRef } from "react";

type BadgeVariant = "default" | "success" | "danger" | "primary";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
    children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
    default:
        "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]",
    success:
        "bg-accent-500/15 text-accent-500 border border-accent-500/25",
    danger:
        "bg-danger-500/15 text-danger-500 border border-danger-500/25",
    primary:
        "bg-primary-500/15 text-primary-400 border border-primary-500/25",
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
    ({ variant = "default", className = "", children, ...props }, ref) => {
        return (
            <span
                ref={ref}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${variantClasses[variant]} ${className}`}
                {...props}
            >
                {children}
            </span>
        );
    }
);

Badge.displayName = "Badge";
export default Badge;
