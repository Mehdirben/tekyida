import { type HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    hover?: boolean;
    children: React.ReactNode;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ hover = false, className = "", children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`liquid-glass-card ${hover ? "hover:-translate-y-1 hover:shadow-lg" : ""} ${className}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = "Card";
export default Card;
