"use client";

import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Trash2, type LucideIcon } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { triggerHaptic } from "@/lib/haptics";

type ConfirmTint = "danger" | "warning";

const TINT_CLASSES: Record<ConfirmTint, { iconWrap: string; icon: string; confirm: string }> = {
    danger: {
        iconWrap: "bg-danger-500/10",
        icon: "text-danger-500",
        confirm: "text-danger-500 active:bg-danger-500/10",
    },
    warning: {
        iconWrap: "bg-warning-500/10",
        icon: "text-warning-500",
        confirm: "text-warning-500 active:bg-warning-500/10",
    },
};

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    description: string;
    itemName?: string;
    onCancel: () => void;
    onConfirm: () => void;
    confirmLabel?: string;
    icon?: LucideIcon;
    tint?: ConfirmTint;
    style?: CSSProperties;
}

export default function ConfirmDialog({
    isOpen,
    title,
    description,
    itemName,
    onCancel,
    onConfirm,
    confirmLabel,
    icon: Icon = Trash2,
    tint = "danger",
    style,
}: ConfirmDialogProps) {
    const { t } = useTranslation();

    if (!isOpen || typeof document === "undefined") return null;

    const handleCancel = () => {
        triggerHaptic("light");
        onCancel();
    };

    const tintClasses = TINT_CLASSES[tint];

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
                    <div className={`inline-flex p-3 rounded-full ${tintClasses.iconWrap} mb-3`}>
                        <Icon size={22} className={tintClasses.icon} />
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
                        className={`flex-1 py-3.5 text-sm font-semibold border-l border-(--border) transition-all cursor-pointer ${tintClasses.confirm}`}
                    >
                        {confirmLabel ?? t("common.delete")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
