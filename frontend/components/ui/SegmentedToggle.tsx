"use client";

import { useEffect, useState, type ComponentType } from "react";
import { triggerHaptic } from "@/lib/haptics";

export interface SegmentedToggleOption<T extends string> {
    value: T;
    icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
    label: string;
}

export interface SegmentedToggleProps<T extends string> {
    storageKey: string;
    defaultValue: T;
    options: SegmentedToggleOption<T>[];
}

export default function SegmentedToggle<T extends string>({
    storageKey,
    defaultValue,
    options,
}: SegmentedToggleProps<T>) {
    const [behavior, setBehaviorState] = useState<T>(defaultValue);

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        if (stored && options.some((o) => o.value === stored)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setBehaviorState(stored as T);
        }
    }, [storageKey, options]);

    const setBehavior = (value: T) => {
        setBehaviorState(value);
        localStorage.setItem(storageKey, value);
        triggerHaptic(behavior === value ? "light" : "selection");
    };

    return (
        <div className="flex items-center liquid-glass rounded-full p-1 shrink-0">
            {options.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    onClick={() => setBehavior(value)}
                    aria-label={label}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                        behavior === value
                            ? "bg-primary-800/80 dark:bg-primary-500/70 text-white shadow-sm backdrop-blur-sm"
                            : "text-(--text-tertiary) hover:text-(--text-primary)"
                    }`}
                >
                    <Icon size={12} strokeWidth={2.2} className="shrink-0" />
                    <span className="whitespace-nowrap">{label}</span>
                </button>
            ))}
        </div>
    );
}
