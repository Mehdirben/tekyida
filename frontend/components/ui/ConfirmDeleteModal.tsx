"use client";

import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { triggerHaptic } from "@/lib/haptics";

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    title: string;
    description: string;
    itemName?: string;
    onCancel: () => void;
    onConfirm: () => void;
    style?: CSSProperties;
}

export default function ConfirmDeleteModal({
    isOpen,
    title,
    description,
    itemName,
    onCancel,
    onConfirm,
    style,
}: ConfirmDeleteModalProps) {
    const { t } = useTranslation();

    if (!isOpen || typeof document === "undefined") return null;

    const handleCancel = () => {
        triggerHaptic("light");
        onCancel();
    };

    return createPortal(
        <div
            className="safe-dialog fixed inset-0 z-[200] flex items-center justify-center transition-[padding] duration-200"
            style={style}
        >
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={handleCancel}
            />
            <div className="relative z-10 w-[90%] max-w-sm liquid-glass-heavy rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
                <div className="p-5 text-center">
                    <div className="inline-flex p-3 rounded-full bg-danger-500/10 mb-3">
                        <Trash2 size={22} className="text-danger-500" />
                    </div>
                    <h3 className="text-base font-bold mb-1">{title}</h3>
                    <p className="text-sm text-(--text-secondary)">{description}</p>
                    {itemName && (
                        <p className="text-sm font-semibold mt-2 break-words whitespace-normal">
                            {itemName}
                        </p>
                    )}
                </div>
                <div className="flex border-t border-(--border)">
                    <button
                        onClick={handleCancel}
                        className="flex-1 py-3.5 text-sm font-medium text-(--text-secondary) transition-all active:bg-white/5 cursor-pointer"
                    >
                        {t("common.cancel")}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3.5 text-sm font-semibold text-danger-500 border-l border-(--border) transition-all active:bg-danger-500/10 cursor-pointer"
                    >
                        {t("common.delete")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
