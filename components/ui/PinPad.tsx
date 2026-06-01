"use client";

import { useEffect, useState } from "react";
import { Delete, Fingerprint } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface PinPadProps {
    value: string;
    onChange: (value: string) => void;
    onComplete?: (pin: string) => void;
    error?: boolean;
    onClearError?: () => void;
    showBiometricButton?: boolean;
    onBiometricClick?: () => void;
    title?: string;
}

export default function PinPad({
    value,
    onChange,
    onComplete,
    error = false,
    onClearError,
    showBiometricButton = false,
    onBiometricClick,
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
                {[
                    { num: 1, letters: "" },
                    { num: 2, letters: "A B C" },
                    { num: 3, letters: "D E F" },
                    { num: 4, letters: "G H I" },
                    { num: 5, letters: "J K L" },
                    { num: 6, letters: "M N O" },
                    { num: 7, letters: "P Q R S" },
                    { num: 8, letters: "T U V" },
                    { num: 9, letters: "W X Y Z" },
                ].map(({ num, letters }) => (
                    <button
                        key={num}
                        type="button"
                        onClick={() => handleKeyPress(num)}
                        className="w-18 h-18 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center glass-btn bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:border-white/45 hover:bg-white/15 dark:hover:bg-white/10 select-none active:scale-[0.88] transition-all duration-150 cursor-pointer pt-0.5 shadow-lg shadow-black/10 dark:shadow-black/30"
                    >
                        <span className="text-3xl font-light text-(--text-primary)">{num}</span>
                        {letters ? (
                            <span className="text-[8.5px] font-bold tracking-widest text-(--text-tertiary) -mt-0.5 uppercase opacity-85 scale-90">
                                {letters}
                            </span>
                        ) : (
                            <span className="h-[10px]" /> // Spacer to keep numbers aligned
                        )}
                    </button>
                ))}

                {/* Bottom Row */}
                {/* 10. Left: Biometric trigger OR placeholder */}
                {showBiometricButton ? (
                    <button
                        type="button"
                        onClick={() => {
                            triggerHaptic("medium");
                            onBiometricClick?.();
                        }}
                        className="w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-primary-500 dark:text-primary-400 glass-btn bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:border-white/45 hover:bg-white/15 dark:hover:bg-white/10 select-none active:scale-[0.88] transition-all duration-150 cursor-pointer shadow-lg shadow-black/10 dark:shadow-black/30"
                    >
                        <Fingerprint size={32} className="animate-pulse" />
                    </button>
                ) : (
                    <div className="w-18 h-18 sm:w-20 sm:h-20" /> // Spacer
                )}

                {/* 11. Center: 0 */}
                <button
                    type="button"
                    onClick={() => handleKeyPress(0)}
                    className="w-18 h-18 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center glass-btn bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:border-white/45 hover:bg-white/15 dark:hover:bg-white/10 select-none active:scale-[0.88] transition-all duration-150 cursor-pointer pt-0.5 shadow-lg shadow-black/10 dark:shadow-black/30"
                >
                    <span className="text-3xl font-light text-(--text-primary)">0</span>
                    <span className="h-[10px] text-[8.5px] font-bold text-(--text-tertiary) -mt-0.5">+</span>
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
