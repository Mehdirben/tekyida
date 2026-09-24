"use client";

import { Plus } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { triggerHaptic } from "@/lib/haptics";
import type { useTransactionCreator } from "@/hooks/useTransactionCreator";

interface AddTransactionFooterProps {
    creator: ReturnType<typeof useTransactionCreator>;
}

export default function AddTransactionFooter({ creator }: AddTransactionFooterProps) {
    const { t } = useTranslation();
    const {
        adding,
        setAdding,
        amount,
        setAmount,
        isPositive,
        setIsPositive,
        description,
        setDescription,
        date,
        setDate,
        handleAdd,
    } = creator;

    return (
        <div className="sheet-safe-x sheet-safe-footer pt-2 border-t border-(--border)">
            {adding ? (
                <div className="space-y-3 animate-scale-in">
                    {/* Amount + Direction Toggle */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsPositive(!isPositive);
                                triggerHaptic("selection");
                            }}
                            className={`shrink-0 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={t("transaction.amount")}
                            className="glass-input py-2.5 text-sm flex-1"
                            min="0"
                            step="0.01"
                        />
                    </div>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAdd();
                            if (e.key === "Escape") {
                                e.stopPropagation();
                                setAdding(false);
                            }
                        }}
                        placeholder={t("transaction.description")}
                        className="glass-input py-2.5 text-sm resize-none"
                        rows={4}
                    />
                    <input
                        type="datetime-local"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="glass-input py-2.5 text-sm w-full min-w-0 appearance-none"
                    />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                triggerHaptic("light");
                                setAdding(false);
                            }}
                            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-(--text-secondary) liquid-glass-flat hover:bg-white/10 transition-all cursor-pointer"
                        >
                            {t("common.cancel")}
                        </button>
                        <button
                            type="button"
                            onClick={handleAdd}
                            disabled={!amount || parseFloat(amount) <= 0}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary-800/80 dark:bg-primary-500/70 text-white transition-all hover:shadow-md disabled:opacity-40 cursor-pointer"
                        >
                            {t("transaction.add")}
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => {
                        triggerHaptic("selection");
                        setAdding(true);
                    }}
                    className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold bg-primary-800/80 dark:bg-primary-500/70 text-white transition-all hover:shadow-md active:scale-[0.97] cursor-pointer"
                >
                    <Plus size={16} />
                    {t("transaction.add")}
                </button>
            )}
        </div>
    );
}
