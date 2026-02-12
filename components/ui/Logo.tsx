import { Wallet } from "lucide-react";

interface LogoProps {
    size?: "sm" | "md" | "lg";
    showText?: boolean;
}

const sizeMap = {
    sm: { icon: 20, text: "text-lg" },
    md: { icon: 24, text: "text-xl" },
    lg: { icon: 32, text: "text-2xl" },
};

export default function Logo({ size = "md", showText = true }: LogoProps) {
    const { icon, text } = sizeMap[size];

    return (
        <div className="flex items-center gap-2">
            <div className="relative">
                <div className="absolute inset-0 bg-primary-500/20 rounded-xl blur-lg" />
                <div className="relative bg-gradient-to-br from-primary-500 to-primary-700 p-2 rounded-xl">
                    <Wallet size={icon} className="text-white" strokeWidth={2.2} />
                </div>
            </div>
            {showText && (
                <span className={`${text} font-bold tracking-tight gradient-text`}>
                    Tekyida
                </span>
            )}
        </div>
    );
}
