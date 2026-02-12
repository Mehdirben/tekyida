import { type HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    hover?: boolean;
    glass?: boolean;
    children: React.ReactNode;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ hover = false, glass = false, className = "", children, ...props }, ref) => {
        const baseClasses =
            "rounded-2xl border border-[var(--border)] transition-all duration-300";
        const bgClasses = glass
            ? "glass"
            : "bg-[var(--bg-card)]";
        const hoverClasses = hover
            ? "hover:border-[var(--border-hover)] hover:shadow-lg hover:shadow-[var(--shadow-color)] hover:-translate-y-1"
            : "";

        return (
            <div
                ref={ref}
                className={`${baseClasses} ${bgClasses} ${hoverClasses} ${className}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = "Card";
export default Card;
