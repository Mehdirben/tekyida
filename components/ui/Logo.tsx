import Image from "next/image";

interface LogoProps {
    size?: "sm" | "md" | "lg";
    showText?: boolean;
}

const sizeMap = {
    sm: { icon: 28, text: "text-base", gap: "gap-2" },
    md: { icon: 36, text: "text-lg", gap: "gap-2.5" },
    lg: { icon: 48, text: "text-xl", gap: "gap-3" },
};

export default function Logo({ size = "md", showText = true }: LogoProps) {
    const { icon, text, gap } = sizeMap[size];

    return (
        <div className={`flex items-center ${gap}`}>
            <Image
                src="/icons/logo-nobg-128.png"
                alt="Tekyida logo"
                width={icon}
                height={icon}
                className="rounded-lg"
                priority
            />
            {showText && (
                <span className={`${text} font-bold tracking-tight`}>
                    Tekyida
                </span>
            )}
        </div>
    );
}
