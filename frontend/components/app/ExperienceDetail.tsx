"use client";

import { useState, useMemo } from "react";
import { X, Receipt, Lock, Unlock, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useLocalAmountsVisibility } from "@/hooks/useLocalAmountsVisibility";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { triggerHaptic } from "@/lib/haptics";
import { formatBalance, balanceColor } from "@/lib/money";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import TransactionModals from "@/components/app/TransactionModals";
import TransactionRow, { type TransactionRowData } from "@/components/app/TransactionRow";
import AddTransactionFooter from "@/components/app/AddTransactionFooter";
import { useTransactionCreator } from "@/hooks/useTransactionCreator";
import { useTransactionMutations } from "@/hooks/useTransactionMutations";
import { useSheetAnimation } from "@/hooks/useSheetAnimation";
import { useTransactionEditor, useTransactionSheetEscape } from "@/hooks/useTransactionEditor";

interface ExperienceDetailProps {
    experienceId: Id<"experiences">;
    experienceName: string;
    notebookId: Id<"notebooks">;
    contactId?: Id<"contacts">;
    closed: boolean;
    onClose: () => void;
    onToggleClosed: () => void;
}

export default function ExperienceDetail({
    experienceId,
    experienceName,
    notebookId,
    contactId,
    closed,
    onClose,
    onToggleClosed,
}: ExperienceDetailProps) {
    useBodyScrollLock(true);
    const keyboardInset = useKeyboardInset();
    const keyboardOffsetStyle = keyboardInset > 0 ? { paddingBottom: `${keyboardInset + 12}px` } : undefined;

    const { t } = useTranslation();
    const { localHidden, localMask, toggleLocal } = useLocalAmountsVisibility();
    const rawTransactions = useCachedQuery<TransactionRowData[]>(
        "transactions.list",
        api.transactions.list,
        { experienceId }
    );
    const transactions = useMemo(() => {
        const txs = rawTransactions ?? [];
        return [...txs].sort((a, b) => (b.date ?? b.createdAt) - (a.date ?? a.createdAt));
    }, [rawTransactions]);
    const { createTransaction, deleteTransaction, updateTransaction, offlineMutation, isItemPending } = useTransactionMutations();

    const { isClosing, animateIn, handleAnimatedClose } = useSheetAnimation(onClose);
    const [deleteTargetId, setDeleteTargetId] = useState<Id<"transactions"> | null>(null);

    const txCreator = useTransactionCreator(async (args) => {
        await offlineMutation(
            "transactions:create",
            createTransaction,
            {
                notebookId,
                ...(contactId ? { contactId } : {}),
                experienceId,
                ...args,
            }
        );
    });

    const txEditor = useTransactionEditor(async (args) => {
        await offlineMutation(
            "transactions:update",
            updateTransaction,
            args,
            { experienceId, notebookId }
        );
    });

    useTransactionSheetEscape({
        deleteTargetId,
        setDeleteTargetId,
        txEditor,
        adding: txCreator.adding,
        setAdding: txCreator.setAdding,
        onClose: handleAnimatedClose,
    });



    const confirmDelete = async () => {
        if (!deleteTargetId) return;
        triggerHaptic("warning");
        await offlineMutation(
            "transactions:remove",
            deleteTransaction,
            { id: deleteTargetId },
            { experienceId, notebookId }
        );
        setDeleteTargetId(null);
    };

    const balance = transactions.reduce((sum, t) => sum + t.amount, 0);

    return (
        <BottomSheetModal
            isClosing={isClosing}
            animateIn={animateIn}
            onClose={handleAnimatedClose}
            style={keyboardOffsetStyle}
        >
                {/* Header */}
                <div className="sheet-safe-x flex items-center justify-between pt-5 pb-3 border-b border-(--border) gap-2">
                    <div className="flex-1 min-w-0 pr-3">
                        <h2 className="text-lg font-bold whitespace-normal break-words">{experienceName}</h2>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <button
                                onClick={() => {
                                    toggleLocal();
                                    triggerHaptic("selection");
                                }}
                                className={`flex items-center gap-1.5 text-sm font-semibold cursor-pointer group ${balanceColor(balance, "text-(--text-secondary)")
                                    }`}
                                aria-label={localHidden ? "Show amounts" : "Hide amounts"}
                            >
                                {formatBalance(balance, localMask)}
                                {localHidden ? <EyeOff size={13} className="opacity-50 group-hover:opacity-80 transition-opacity" /> : <Eye size={13} className="opacity-50 group-hover:opacity-80 transition-opacity" />}
                            </button>
                            <span className="text-[11px] text-(--text-tertiary)">·</span>
                            <button
                                onClick={() => {
                                    triggerHaptic(closed ? "selection" : "warning");
                                    onToggleClosed();
                                }}
                                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-all shrink-0 ${
                                    closed
                                        ? "bg-warning-500/15 text-warning-500"
                                        : "bg-accent-500/15 text-accent-500"
                                }`}
                            >
                                {closed ? <Lock size={9} /> : <Unlock size={9} />}
                                {closed ? t("experience.closed") : t("experience.open")}
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleAnimatedClose}
                        className="p-2 rounded-xl liquid-glass hover:bg-white/10 transition-all cursor-pointer shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Closed Notice */}
                {closed && (
                    <div className="px-5 py-2.5 bg-warning-500/10 border-b border-warning-500/20">
                        <p className="text-xs text-warning-500 font-medium text-center">
                            {t("experience.closedNotice")}
                        </p>
                    </div>
                )}

                {/* Transaction List */}
                <div className="sheet-safe-x sheet-safe-scroll flex-1 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] pt-4 space-y-2.5">
                    {transactions.length === 0 && !txCreator.adding ? (
                        <div className="text-center py-8">
                            <div className="inline-flex p-3 rounded-2xl liquid-glass mb-3">
                                <Receipt size={24} className="text-primary-500" />
                            </div>
                            <p className="text-sm text-(--text-secondary)">
                                {t("transaction.empty")}
                            </p>
                        </div>
                    ) : (
                        transactions.map((tx) => (
                            <TransactionRow
                                key={tx._id}
                                transaction={tx}
                                mask={localMask}
                                isPending={isItemPending(tx._id)}
                                onEdit={!closed ? (t2) => txEditor.handleOpenEdit(t2) : undefined}
                                onDelete={!closed ? setDeleteTargetId : undefined}
                            />
                        ))
                    )}
                </div>

                <TransactionModals
                    deleteTargetId={deleteTargetId}
                    onCancelDelete={() => setDeleteTargetId(null)}
                    onConfirmDelete={confirmDelete}
                    txEditor={txEditor}
                    keyboardOffsetStyle={keyboardOffsetStyle}
                />

                {!closed && <AddTransactionFooter creator={txCreator} />}
        </BottomSheetModal>
    );
}
