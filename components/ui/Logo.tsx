import { BookOpen } from "lucide-react";

interface LogoProps {
    size?: "sm" | "md" | "lg";
    showText?: boolean;
}

const sizeMap = {
    sm: { icon: 16, text: "text-base", pad: "p-1.5", gap: "gap-2" },
    md: { icon: 18, text: "text-lg", pad: "p-2", gap: "gap-2.5" },
    lg: { icon: 24, text: "text-xl", pad: "p-3", gap: "gap-3" },
};

export default function Logo({ size = "md", showText = true }: LogoProps) {
    const { icon, text, pad, gap } = sizeMap[size];

    return (
        <div className={`flex items-center ${gap}`}>
            <div className={`${pad} rounded-xl liquid-glass`}>
                <BookOpen size={icon} className="text-primary-700 dark:text-primary-300" strokeWidth={2.2} />
            </div>
            {showText && (
                <span className={`${text} font-bold tracking-tight`}>
                    Tekyida
                </span>
            )}
        </div>
    );
}
