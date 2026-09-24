"use client";

import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";

interface EditModalDialogProps {
    isOpen: boolean;
    isClosing: boolean;
    title: string;
    onClose: () => void;
    onSave: () => void;
    saveDisabled?: boolean;
    style?: CSSProperties;
    children: ReactNode;
}

export default function EditModalDialog({
    isOpen,
    isClosing,
    title,
    onClose,
    onSave,
    saveDisabled = false,
    style,
    children,
}: EditModalDialogProps) {
    const { t } = useTranslation();

    if (!isOpen || typeof document === "undefined") return null;

    return createPortal(
        <div
            className="safe-dialog fixed inset-0 z-[200] flex items-center justify-center transition-[padding] duration-200"
            style={style}
        >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div
                className={`relative z-10 w-[90%] max-w-sm liquid-glass-heavy rounded-2xl shadow-2xl overflow-hidden ${
                    isClosing ? "animate-scale-out" : "animate-scale-in"
                }`}
            >
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-(--border)">
                    <h3 className="text-base font-bold">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg active:bg-white/10 transition-all cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="p-5 space-y-3">{children}</div>
                <div className="flex border-t border-(--border)">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 text-sm font-medium text-(--text-secondary) transition-all active:bg-white/5 cursor-pointer"
                    >
                        {t("common.cancel")}
                    </button>
                    <button
                        onClick={onSave}
                        disabled={saveDisabled}
                        className="flex-1 py-3.5 text-sm font-semibold text-primary-500 border-l border-(--border) transition-all active:bg-primary-500/10 disabled:opacity-50 cursor-pointer"
                    >
                        {t("common.save")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
