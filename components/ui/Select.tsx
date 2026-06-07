"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

export interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export default function Select({
    options,
    value,
    onChange,
    placeholder,
    className = "",
}: SelectProps) {
    const [open, setOpen] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

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
                <span className={`truncate flex-1 min-w-0 text-left pr-2 ${selectedOption ? "text-(--text-primary)" : "text-(--text-tertiary)"}`}>
                    {selectedOption ? selectedOption.label : placeholder}
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
                    {options.map((option) => (
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
                </div>
            </div>
        </div>
    );
}
