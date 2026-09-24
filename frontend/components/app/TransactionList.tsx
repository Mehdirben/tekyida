"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
    ArrowDownLeft,
    ArrowUpRight,
    Plus,
    Trash2,
    Pencil,
    X,
    Receipt,
    CloudOff,
    Eye,
    EyeOff,
    Loader2,
} from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useLocalAmountsVisibility } from "@/hooks/useLocalAmountsVisibility";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSync } from "@/contexts/SyncContext";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import ExperienceContactCard from "@/components/app/ExperienceContactCard";
import { toLocalDatetime } from "@/lib/dateUtils";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import TransactionModals from "@/components/app/TransactionModals";
import AddTransactionFooter from "@/components/app/AddTransactionFooter";
import { useTransactionCreator } from "@/hooks/useTransactionCreator";
import { useTransactionMutations } from "@/hooks/useTransactionMutations";
import { useSheetAnimation } from "@/hooks/useSheetAnimation";
import { useTransactionEditor, useTransactionSheetEscape } from "@/hooks/useTransactionEditor";
import { triggerHaptic } from "@/lib/haptics";

interface ExperienceForContact {
    _id: Id<"experiences">;
    name: string;
    closed: boolean;
    balance: number;
    transactionCount: number;
    lastTransactionDate?: number;
}

interface TransactionListProps {
    contactId: Id<"contacts">;
    contactName: string;
    notebookId: Id<"notebooks">;
    onClose: () => void;
    experiences?: ExperienceForContact[];
}

export default function TransactionList({
    contactId,
    contactName,
    notebookId,
    onClose,
    experiences,
}: TransactionListProps) {
    useBodyScrollLock(true);
    const keyboardInset = useKeyboardInset();
    const keyboardOffsetStyle = keyboardInset > 0 ? { paddingBottom: `${keyboardInset + 12}px` } : undefined;

    const { t } = useTranslation();
    const { localHidden, localMask, toggleLocal } = useLocalAmountsVisibility();
    const router = useRouter();
    const rawTransactions = useCachedQuery<{ _id: Id<"transactions">; amount: number; description?: string; date?: number; createdAt: number }[]>("transactions.list", api.transactions.list, { contactId });
    // For offline-created contacts (temp_ IDs), there are no server transactions yet — treat undefined as empty
    const transactions = rawTransactions ?? (contactId.startsWith("temp_") ? [] : undefined);
    const { createTransaction, deleteTransaction, updateTransaction, offlineMutation, isItemPending } = useTransactionMutations();

    const { isClosing, animateIn, handleAnimatedClose } = useSheetAnimation(onClose);
    const [deleteTargetId, setDeleteTargetId] = useState<Id<"transactions"> | null>(null);

    const txCreator = useTransactionCreator(async (args) => {
        await offlineMutation(
            "transactions:create",
            createTransaction,
            {
                notebookId,
                contactId,
                ...args,
            }
        );
    });

    const txEditor = useTransactionEditor(async (args) => {
        await offlineMutation(
            "transactions:update",
            updateTransaction,
            args,
            { contactId, notebookId }
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
            { contactId, notebookId }
        );
        setDeleteTargetId(null);
    };



    const formatDate = (ts: number) => {
        return new Date(ts).toLocaleString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const directBalance =
        transactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0;
    const experienceBalance =
        experiences?.reduce((sum, e) => sum + e.balance, 0) ?? 0;
    const balance = directBalance + experienceBalance;

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
                        <h2 className="text-lg font-bold whitespace-normal break-words">{contactName}</h2>
                        <button
                            onClick={() => {
                                toggleLocal();
                                triggerHaptic("selection");
                            }}
                            className={`flex items-center gap-1.5 text-sm font-semibold mt-0.5 cursor-pointer group ${balance > 0
                                ? "text-accent-500"
                                : balance < 0
                                    ? "text-danger-500"
                                    : "text-(--text-secondary)"
                                }`}
                            aria-label={localHidden ? "Show amounts" : "Hide amounts"}
                        >
                            {localMask(`${balance >= 0 ? "+" : ""}${balance.toFixed(2)} MAD`)}
                            {localHidden ? <EyeOff size={13} className="opacity-50 group-hover:opacity-80 transition-opacity" /> : <Eye size={13} className="opacity-50 group-hover:opacity-80 transition-opacity" />}
                        </button>
                    </div>
                    <button
                        onClick={handleAnimatedClose}
                        className="p-2 rounded-xl liquid-glass hover:bg-white/10 transition-all cursor-pointer shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Transaction List — merged timeline of transactions + experience cards sorted by date */}
                <div className="sheet-safe-x sheet-safe-scroll flex-1 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] pt-4 space-y-2.5">
                    {!transactions ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-sm text-(--text-secondary)">
                            <Loader2 size={24} className="animate-spin text-primary-500" />
                            <span>{t("dashboard.loading")}</span>
                        </div>
                    ) : transactions.length === 0 && !txCreator.adding && (!experiences || experiences.length === 0) ? (
                        <div className="text-center py-8">
                            <div className="inline-flex p-3 rounded-2xl liquid-glass mb-3">
                                <Receipt size={24} className="text-primary-500" />
                            </div>
                            <p className="text-sm text-(--text-secondary)">
                                {t("transaction.empty")}
                            </p>
                        </div>
                    ) : (
                        <TimelineMerged
                            transactions={transactions}
                            experiences={experiences}
                            formatDate={formatDate}
                            mask={localMask}
                            isItemPending={isItemPending}
                            openEditTx={txEditor.handleOpenEdit}
                            setDeleteTargetId={setDeleteTargetId}
                            onExperienceClick={(expId) => {
                                handleAnimatedClose();
                                setTimeout(() => router.push(`/app/experiences?open=${expId}`), 350);
                            }}
                        />
                    )}
                </div>

                <TransactionModals
                    deleteTargetId={deleteTargetId}
                    onCancelDelete={() => setDeleteTargetId(null)}
                    onConfirmDelete={confirmDelete}
                    txEditor={txEditor}
                    keyboardOffsetStyle={keyboardOffsetStyle}
                />

                <AddTransactionFooter creator={txCreator} />
        </BottomSheetModal>
    );
}

// ─── Merged timeline component ──────────────────────────────────────────

type TimelineItem =
    | { type: "transaction"; sortDate: number; data: { _id: Id<"transactions">; amount: number; description?: string; date?: number; createdAt: number } }
    | { type: "experience"; sortDate: number; data: ExperienceForContact };

function TimelineMerged({
    transactions,
    experiences,
    formatDate,
    mask,
    isItemPending,
    openEditTx,
    setDeleteTargetId,
    onExperienceClick,
}: {
    transactions: { _id: Id<"transactions">; amount: number; description?: string; date?: number; createdAt: number }[];
    experiences?: ExperienceForContact[];
    formatDate: (ts: number) => string;
    mask: (s: string) => string;
    isItemPending: (id: string) => boolean;
    openEditTx: (tx: { _id: Id<"transactions">; amount: number; description?: string; date?: number; createdAt: number }) => void;
    setDeleteTargetId: (id: Id<"transactions">) => void;
    onExperienceClick: (expId: string) => void;
}) {
    const items: TimelineItem[] = useMemo(() => {
        const txItems: TimelineItem[] = transactions.map((tx) => ({
            type: "transaction" as const,
            sortDate: tx.date ?? tx.createdAt,
            data: tx,
        }));

        const expItems: TimelineItem[] = (experiences ?? []).map((exp) => ({
            type: "experience" as const,
            sortDate: exp.lastTransactionDate ?? 0,
            data: exp,
        }));

        return [...txItems, ...expItems].sort((a, b) => b.sortDate - a.sortDate);
    }, [transactions, experiences]);

    return (
        <>
            {items.map((item) => {
                if (item.type === "experience") {
                    const exp = item.data as ExperienceForContact;
                    return (
                        <ExperienceContactCard
                            key={exp._id}
                            experience={exp}
                            onSelect={() => onExperienceClick(exp._id)}
                            mask={mask}
                        />
                    );
                }

                const tx = item.data as { _id: Id<"transactions">; amount: number; description?: string; date?: number; createdAt: number };
                return (
                    <div
                        key={tx._id}
                        className="liquid-glass-card-flat p-3.5 flex items-center gap-3"
                    >
                        <div
                            className={`p-1.5 rounded-lg ${tx.amount > 0
                                ? "bg-accent-500/10"
                                : "bg-danger-500/10"
                                }`}
                        >
                            {tx.amount > 0 ? (
                                <ArrowDownLeft size={16} className="text-accent-500" />
                            ) : (
                                <ArrowUpRight size={16} className="text-danger-500" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-(--text-tertiary)">
                                {formatDate(tx.date ?? tx.createdAt)}
                            </p>
                            {tx.description && (
                                <p className="text-sm text-(--text-primary) whitespace-normal break-words mt-0.5">
                                    {tx.description}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {isItemPending(tx._id) && (
                                <CloudOff size={12} className="text-warning-500" />
                            )}
                            <span
                                className={`text-sm font-bold ${tx.amount > 0
                                    ? "text-accent-500"
                                    : "text-danger-500"
                                    }`}
                            >
                                {mask(`${tx.amount > 0 ? "+" : ""}${tx.amount.toFixed(2)}`)}
                            </span>
                            <button
                                onClick={() => {
                                    openEditTx(tx);
                                }}
                                className="p-1 rounded-md text-(--text-tertiary) active:bg-white/10 transition-all cursor-pointer"
                            >
                                <Pencil size={12} />
                            </button>
                            <button
                                onClick={() => {
                                    triggerHaptic("warning");
                                    setDeleteTargetId(tx._id);
                                }}
                                className="p-1 rounded-md text-danger-500/60 active:bg-danger-500/10 transition-all cursor-pointer"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                );
            })}
        </>
    );
}
