"use client";

import { useEffect, useState } from "react";
import { Delete } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface PinPadProps {
    value: string;
    onChange: (value: string) => void;
    onComplete?: (pin: string) => void;
    error?: boolean;
    onClearError?: () => void;
    title?: string;
}

export default function PinPad({
    value,
    onChange,
    onComplete,
    error = false,
    onClearError,
    title,
}: PinPadProps) {
    const maxDigits = 6;
    const [shakeActive, setShakeActive] = useState(false);

    // Watch for error trigger to play shake animation
    useEffect(() => {
        if (error) {
            const stateTimer = setTimeout(() => {
                setShakeActive(true);
            }, 0);
            triggerHaptic("warning");
            const timer = setTimeout(() => {
                setShakeActive(false);
                onClearError?.();
            }, 450); // Matches .animate-shake duration (400ms + buffer)
            return () => {
                clearTimeout(stateTimer);
                clearTimeout(timer);
            };
        }
    }, [error, onClearError]);


    const handleKeyPress = (num: number) => {
        if (value.length >= maxDigits) return;
        
        triggerHaptic("selection");
        const newValue = value + num.toString();
        onChange(newValue);
        
        if (newValue.length === maxDigits && onComplete) {
            // Tiny timeout to let the final dot update visually before triggering actions
            setTimeout(() => {
                onComplete(newValue);
            }, 100);
        }
    };

    const handleDelete = () => {
        if (value.length === 0) return;
        
        triggerHaptic("light");
        const newValue = value.slice(0, -1);
        onChange(newValue);
    };

    // Listen to physical keyboard events
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName.toLowerCase();
            if (activeTag === "input" || activeTag === "textarea") {
                return;
            }

            if (e.key >= "0" && e.key <= "9") {
                const num = parseInt(e.key, 10);
                handleKeyPress(num);
            } else if (e.key === "Backspace" || e.key === "Delete") {
                handleDelete();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto select-none">
            {/* Title / Description */}
            {title && (
                <p className="text-sm font-semibold tracking-wide text-(--text-secondary) mb-8 animate-fade-in text-center">
                    {title}
                </p>
            )}

            {/* PIN Indicators (6 dots) */}
            <div 
                className={`flex gap-5 mb-12 justify-center items-center ${
                    shakeActive ? "animate-shake" : ""
                }`}
            >
                {Array.from({ length: maxDigits }).map((_, index) => {
                    const isFilled = index < value.length;
                    return (
                        <div
                            key={index}
                            className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 transform ${
                                isFilled
                                    ? "bg-primary-500 border-primary-500 scale-110 shadow-[0_0_8px_rgba(90,107,170,0.5)] dark:bg-primary-400 dark:border-primary-400"
                                    : "border-(--text-tertiary)/40 bg-transparent scale-100"
                            }`}
                        />
                    );
                })}
            </div>

            {/* Keypad Grid (3 columns) */}
            <div className="grid grid-cols-3 gap-y-4 gap-x-6 justify-items-center w-full px-4 sm:px-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                        key={num}
                        type="button"
                        onClick={() => handleKeyPress(num)}
                        className="w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center glass-btn bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:border-white/45 hover:bg-white/15 dark:hover:bg-white/10 select-none active:scale-[0.88] transition-all duration-150 cursor-pointer shadow-lg shadow-black/10 dark:shadow-black/30"
                    >
                        <span className="text-3xl font-light text-(--text-primary)">{num}</span>
                    </button>
                ))}

                {/* Bottom Row */}
                {/* 10. Left: Spacer to maintain grid alignment */}
                <div className="w-18 h-18 sm:w-20 sm:h-20" />

                {/* 11. Center: 0 */}
                <button
                    type="button"
                    onClick={() => handleKeyPress(0)}
                    className="w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center glass-btn bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:border-white/45 hover:bg-white/15 dark:hover:bg-white/10 select-none active:scale-[0.88] transition-all duration-150 cursor-pointer shadow-lg shadow-black/10 dark:shadow-black/30"
                >
                    <span className="text-3xl font-light text-(--text-primary)">0</span>
                </button>

                {/* 12. Right: Delete (Backspace) */}
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={value.length === 0}
                    className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer ${
                        value.length === 0
                            ? "text-(--text-tertiary)/15 pointer-events-none"
                            : "text-(--text-secondary) hover:text-(--text-primary) active:scale-[0.85]"
                    }`}
                >
                    <Delete size={22} />
                </button>
            </div>
        </div>
    );
}
