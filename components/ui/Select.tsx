"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Archive } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { useTranslation } from "@/i18n/LanguageContext";

export interface SelectOption {
    value: string;
    label: string;
    archived?: boolean;
}

interface SelectProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    footerButton?: {
        icon: React.ReactNode;
        label: string;
        onClick: () => void;
        active?: boolean;
    };
}

export default function Select({
    options,
    value,
    onChange,
    placeholder,
    className = "",
    footerButton,
}: SelectProps) {
    const [open, setOpen] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const { t } = useTranslation();
    const selectedOption = options.find((opt) => opt.value === value);

    const activeOptions = options.filter((opt) => !opt.archived);
    const archivedOptions = options.filter((opt) => opt.archived);

    // Close on click outside and escape key
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setOpen(false);
            }
        }
        if (open) {
            document.addEventListener("mousedown", handleClick);
            document.addEventListener("keydown", handleKeyDown);
            return () => {
                document.removeEventListener("mousedown", handleClick);
                document.removeEventListener("keydown", handleKeyDown);
            };
        }
    }, [open]);

    // Check if there is enough space below, else open upward
    useEffect(() => {
        if (open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            if (spaceBelow < 220 && spaceAbove > spaceBelow) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setOpenUpward(true);
            } else {
                setOpenUpward(false);
            }
        }
    }, [open]);

    const handleToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        triggerHaptic("selection");
        setOpen(!open);
    };

    return (
        <div ref={dropdownRef} className="relative w-full">
            {/* Trigger Button */}
            <button
                ref={triggerRef}
                onClick={handleToggle}
                type="button"
                className={`glass-input relative w-full flex items-center justify-between text-left cursor-pointer transition-all duration-200 active:scale-[0.99] py-2.5 text-sm min-w-0 ${className}`}
            >
                <span className={`truncate flex-1 min-w-0 text-left pr-2 flex items-center gap-1.5 ${selectedOption ? "text-(--text-primary)" : "text-(--text-tertiary)"}`}>
                    {selectedOption?.archived && <Archive size={14} className="text-warning-500 shrink-0" />}
                    <span className="truncate">
                        {selectedOption
                            ? selectedOption.archived
                                ? `${selectedOption.label} (${t("notebook.archivedStatus")})`
                                : selectedOption.label
                            : placeholder}
                    </span>
                </span>
                <ChevronDown
                    size={16}
                    className={`text-(--text-tertiary) transition-transform duration-300 ease-out shrink-0 ml-2 ${
                        open ? "rotate-180" : ""
                    }`}
                />
            </button>

            {/* Dropdown Options */}
            <div
                className={`absolute left-0 w-full rounded-2xl overflow-hidden z-60 transition-all duration-300 ease-out ${
                    openUpward ? "bottom-full mb-2 origin-bottom" : "top-full mt-2 origin-top"
                } ${
                    open
                        ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                        : `opacity-0 scale-95 pointer-events-none ${openUpward ? "translate-y-1" : "-translate-y-1"}`
                }`}
                style={{
                    background: "var(--dropdown-bg, rgba(255, 255, 255, 0.88))",
                    backdropFilter: "blur(40px) saturate(2)",
                    WebkitBackdropFilter: "blur(40px) saturate(2)",
                    border: "1px solid var(--glass-border)",
                    boxShadow: "0 12px 48px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 var(--glass-highlight)",
                }}
            >
                <div className="max-h-60 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] py-1.5">
                    {activeOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                triggerHaptic("selection");
                                onChange(option.value);
                                setOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
                                option.value === value
                                    ? "bg-primary-500/12 text-primary-700 dark:text-primary-300 font-semibold"
                                    : "text-(--text-primary) hover:bg-white/5 active:bg-white/10"
                            }`}
                        >
                            <span className="truncate flex-1 pr-2 text-left">{option.label}</span>
                            {option.value === value && (
                                <Check size={14} className="text-primary-500 shrink-0" />
                            )}
                        </button>
                    ))}

                    {archivedOptions.length > 0 && (
                        <div className="border-t border-(--border)/30 mt-2 pt-2 bg-black/5 dark:bg-white/2 divide-y divide-(--border)/30">
                            <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-(--text-tertiary) select-none">
                                {t("notebook.archivedSection")} ({archivedOptions.length})
                            </div>
                            {archivedOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        triggerHaptic("selection");
                                        onChange(option.value);
                                        setOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
                                        option.value === value
                                            ? "bg-primary-500/12 text-primary-700 dark:text-primary-300 font-semibold"
                                            : "text-(--text-secondary) hover:bg-white/5 active:bg-white/10"
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                        <Archive size={14} className="shrink-0 text-(--text-tertiary)" />
                                        <span className="truncate text-left">{option.label}</span>
                                    </div>
                                    {option.value === value && (
                                        <Check size={14} className="text-primary-500 shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {footerButton && (
                    <div className="border-t border-(--border)">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                triggerHaptic("selection");
                                footerButton.onClick();
                            }}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-center transition-all duration-200 cursor-pointer font-semibold text-sm ${
                                footerButton.active
                                    ? "text-warning-500 bg-warning-500/8 dark:bg-warning-500/12 hover:bg-warning-500/12 dark:hover:bg-warning-500/20"
                                    : "text-primary-600 dark:text-primary-400 hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                        >
                            {footerButton.icon}
                            <span>{footerButton.label}</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
