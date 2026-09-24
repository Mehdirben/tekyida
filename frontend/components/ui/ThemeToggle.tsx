"use client";

import { Sun, Monitor, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { triggerHaptic } from "@/lib/haptics";

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    const options = [
        { value: "light" as const, icon: Sun, label: "Light" },
        { value: "system" as const, icon: Monitor, label: "System" },
        { value: "dark" as const, icon: Moon, label: "Dark" },
    ];

    return (
        <div className="flex items-center liquid-glass rounded-full p-1 shrink-0">
            {options.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    onClick={() => {
                        setTheme(value);
                        triggerHaptic(theme === value ? "light" : "selection");
                    }}
                    aria-label={label}
                    className={`p-1.5 rounded-full transition-all duration-200 cursor-pointer ${theme === value
                            ? "bg-primary-800/80 dark:bg-primary-500/70 text-white shadow-sm backdrop-blur-sm"
                            : "text-(--text-tertiary) hover:text-(--text-primary)"
                        }`}
                >
                    <Icon size={13} strokeWidth={2.2} />
                </button>
            ))}
        </div>
    );
}
