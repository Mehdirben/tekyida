"use client";

import { useEffect, useState, type ComponentType } from "react";
import { triggerHaptic } from "@/lib/haptics";

type SegmentedLabelMode = "always" | "sm" | "never";

interface SegmentedToggleOption<T extends string> {
    value: T;
    label: string;
    ariaLabel?: string;
    icon?: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
    emoji?: string;
    labelMode?: SegmentedLabelMode;
}

interface SegmentedToggleProps<T extends string> {
    /** Uncontrolled mode: persist selection under this key */
    storageKey?: string;
    defaultValue?: T;
    /** Controlled mode: external state */
    value?: T;
    onChange?: (value: T) => void;
    options: SegmentedToggleOption<T>[];
}

export default function SegmentedToggle<T extends string>({
    storageKey,
    defaultValue,
    value,
    onChange,
    options,
}: SegmentedToggleProps<T>) {
    const [internalValue, setInternalValue] = useState<T | null>(null);

    useEffect(() => {
        if (!storageKey) return;
        const stored = localStorage.getItem(storageKey);
        if (stored && options.some((o) => o.value === stored)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- sync persisted selection after mount to avoid SSR hydration mismatch
            setInternalValue(stored as T);
        }
    }, [storageKey, options]);

    const current = value ?? internalValue ?? defaultValue;

    const select = (next: T) => {
        triggerHaptic(current === next ? "light" : "selection");
        if (!value) setInternalValue(next);
        if (storageKey) localStorage.setItem(storageKey, next);
        onChange?.(next);
    };

    return (
        <div className="flex items-center liquid-glass rounded-full p-1 shrink-0">
            {options.map((option) => {
                const { icon: Icon, emoji, label, ariaLabel, labelMode = "always" } = option;
                const isActive = current === option.value;
                const pillClassName =
                    labelMode === "never"
                        ? "p-1.5 rounded-full transition-all duration-200 cursor-pointer"
                        : labelMode === "sm"
                            ? "px-2 py-1 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1"
                            : "px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1";
                return (
                    <button
                        key={option.value}
                        onClick={() => select(option.value)}
                        aria-label={ariaLabel ?? label}
                        className={`${pillClassName} ${
                            isActive
                                ? "bg-primary-800/80 dark:bg-primary-500/70 text-white shadow-sm backdrop-blur-sm"
                                : "text-(--text-tertiary) hover:text-(--text-primary)"
                        }`}
                    >
                        {Icon && (
                            <Icon
                                size={labelMode === "never" ? 13 : 12}
                                strokeWidth={2.2}
                                className="shrink-0"
                            />
                        )}
                        {emoji && <span>{emoji}</span>}
                        {labelMode === "always" && (
                            <span className="whitespace-nowrap">{label}</span>
                        )}
                        {labelMode === "sm" && (
                            <span className="hidden sm:inline">{label}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
