"use client";

import { Sun, Monitor, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    const options = [
        { value: "light" as const, icon: Sun, label: "Light" },
        { value: "system" as const, icon: Monitor, label: "System" },
        { value: "dark" as const, icon: Moon, label: "Dark" },
    ];

    return (
        <div className="flex items-center bg-[var(--bg-card)] border border-[var(--border)] rounded-full p-0.5">
            {options.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    onClick={() => setTheme(value)}
                    aria-label={label}
                    className={`p-1.5 rounded-full transition-all duration-200 cursor-pointer ${theme === value
                            ? "bg-primary-500 text-white shadow-md shadow-primary-500/25"
                            : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        }`}
                >
                    <Icon size={14} strokeWidth={2.2} />
                </button>
            ))}
        </div>
    );
}
