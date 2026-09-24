"use client";

import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";

interface BottomSheetModalProps {
    isClosing: boolean;
    animateIn: boolean;
    onClose: () => void;
    style?: CSSProperties;
    children: ReactNode;
}

export default function BottomSheetModal({
    isClosing,
    animateIn,
    onClose,
    style,
    children,
}: BottomSheetModalProps) {
    if (typeof document === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center transition-[padding] duration-200"
            style={style}
        >
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            <div
                className={`bottom-sheet-frame relative z-10 w-full sm:max-w-md h-[92dvh] ${
                    isClosing ? "animate-sheet-down" : animateIn ? "animate-sheet-up" : ""
                }`}
            >
                <div className="h-full flex flex-col liquid-glass-heavy rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
