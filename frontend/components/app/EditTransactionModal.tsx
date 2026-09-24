"use client";

import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { triggerHaptic } from "@/lib/haptics";

interface EditTransactionModalProps {
    isOpen: boolean;
    isClosing: boolean;
    amount: string;
    isPositive: boolean;
    description: string;
    date: string;
    onAmountChange: (val: string) => void;
    onPositiveToggle: () => void;
    onDescriptionChange: (val: string) => void;
    onDateChange: (val: string) => void;
    onClose: () => void;
    onSave: () => void;
    style?: CSSProperties;
}

export default function EditTransactionModal({
    isOpen,
    isClosing,
    amount,
    isPositive,
    description,
    date,
    onAmountChange,
    onPositiveToggle,
    onDescriptionChange,
    onDateChange,
    onClose,
    onSave,
    style,
}: EditTransactionModalProps) {
    const { t } = useTranslation();

    if (!isOpen || typeof document === "undefined") return null;

    const parsedAmount = parseFloat(amount);
    const canSave = !isNaN(parsedAmount) && parsedAmount > 0;

    return createPortal(
        <div
            className="safe-dialog fixed inset-0 z-[300] flex items-center justify-center transition-[padding] duration-200"
            style={style}
        >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div
                className={`relative z-10 w-[85%] max-w-xs liquid-glass-heavy rounded-2xl shadow-2xl overflow-hidden ${
                    isClosing ? "animate-scale-out" : "animate-scale-in"
                }`}
            >
                <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-(--border)">
                    <h3 className="text-sm font-bold">{t("transaction.edit")}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg active:bg-white/10 transition-all cursor-pointer"
                    >
                        <X size={14} />
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                onPositiveToggle();
                                triggerHaptic("selection");
                            }}
                            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isPositive
                                    ? "bg-accent-500/15 text-accent-500 border border-accent-500/30"
                                    : "bg-danger-500/15 text-danger-500 border border-danger-500/30"
                            }`}
                        >
                            {isPositive
                                ? t("transaction.theyOweYou")
                                : t("transaction.youOweThem")}
                        </button>
                        <input
                            type="number"
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => onAmountChange(e.target.value)}
                            placeholder={t("transaction.amount")}
                            className="glass-input py-2 text-sm flex-1"
                            min="0"
                            step="0.01"
                        />
                    </div>
                    <textarea
                        value={description}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onSave();
                            if (e.key === "Escape") {
                                e.stopPropagation();
                                onClose();
                            }
                        }}
                        placeholder={t("transaction.description")}
                        className="glass-input py-2 text-sm resize-none"
                        rows={4}
                    />
                    <input
                        type="datetime-local"
                        value={date}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="glass-input py-2 text-sm w-full min-w-0 appearance-none"
                    />
                </div>
                <div className="flex border-t border-(--border)">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 text-sm font-medium text-(--text-secondary) transition-all active:bg-white/5 cursor-pointer"
                    >
                        {t("common.cancel")}
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={!canSave}
                        className="flex-1 py-3 text-sm font-semibold text-primary-500 border-l border-(--border) transition-all active:bg-primary-500/10 disabled:opacity-40 cursor-pointer"
                    >
                        {t("common.save")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
