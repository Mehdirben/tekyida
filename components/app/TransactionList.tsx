"use client";

import { useState, useCallback, useMemo } from "react";
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
} from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useAmountsVisibility } from "@/contexts/AmountsVisibilityContext";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSync } from "@/contexts/SyncContext";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import ExperienceContactCard from "@/components/app/ExperienceContactCard";
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
    onSelectExperience?: (exp: ExperienceForContact) => void;
}

function toLocalDatetime(ts: number) {
    const d = new Date(ts);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TransactionList({
    contactId,
    contactName,
    notebookId,
    onClose,
    experiences,
    onSelectExperience,
}: TransactionListProps) {
    useBodyScrollLock(true);
    const keyboardInset = useKeyboardInset();
    const keyboardOffsetStyle = keyboardInset > 0 ? { paddingBottom: `${keyboardInset + 12}px` } : undefined;

    const { t } = useTranslation();
    const { mask } = useAmountsVisibility();
    const router = useRouter();
    const rawTransactions = useCachedQuery<{ _id: Id<"transactions">; amount: number; description?: string; date?: number; createdAt: number }[]>("transactions.list", api.transactions.list, { contactId });
    // For offline-created contacts (temp_ IDs), there are no server transactions yet — treat undefined as empty
    const transactions = rawTransactions ?? (contactId.startsWith("temp_") ? [] : undefined);
    const createTransaction = useMutation(api.transactions.create);
    const deleteTransaction = useMutation(api.transactions.remove);
    const updateTransaction = useMutation(api.transactions.update);
    const { offlineMutation, isItemPending } = useSync();

    const [adding, setAdding] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [amount, setAmount] = useState("");
    const [isPositive, setIsPositive] = useState(true); // true = they owe you
    const [description, setDescription] = useState("");
    const [deleteTargetId, setDeleteTargetId] = useState<Id<"transactions"> | null>(null);
    const [date, setDate] = useState(() => toLocalDatetime(Date.now()));
    const [editTarget, setEditTarget] = useState<{ _id: Id<"transactions">; amount: number; description?: string; date?: number; createdAt: number } | null>(null);
    const [editAmount, setEditAmount] = useState("");
    const [editIsPositive, setEditIsPositive] = useState(true);
    const [editDescription, setEditDescription] = useState("");
    const [editDate, setEditDate] = useState("");

    const handleAnimatedClose = useCallback(() => {
        triggerHaptic("light");
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300);
    }, [onClose]);

    const handleAdd = async () => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) return;
        triggerHaptic("success");

        const parsedDate = date ? new Date(date).getTime() : Date.now();

        await offlineMutation(
            "transactions:create",
            createTransaction,
            {
                notebookId,
                contactId,
                amount: isPositive ? parsedAmount : -parsedAmount,
                description: description.trim() || undefined,
                date: isNaN(parsedDate) ? Date.now() : parsedDate,
            }
        );
        setAmount("");
        setDescription("");
        setDate(toLocalDatetime(Date.now()));
        setAdding(false);
    };

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

    const openEditTx = (tx: { _id: Id<"transactions">; amount: number; description?: string; date?: number; createdAt: number }) => {
        triggerHaptic("light");
        setEditTarget(tx);
        setEditAmount(Math.abs(tx.amount).toString());
        setEditIsPositive(tx.amount >= 0);
        setEditDescription(tx.description || "");
        setEditDate(toLocalDatetime(tx.date ?? tx.createdAt));
    };

    const handleEditTx = async () => {
        if (!editTarget) return;
        const parsedAmount = parseFloat(editAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) return;
        triggerHaptic("success");
        const parsedDate = editDate ? new Date(editDate).getTime() : Date.now();
        await offlineMutation(
            "transactions:update",
            updateTransaction,
            {
                id: editTarget._id,
                amount: editIsPositive ? parsedAmount : -parsedAmount,
                description: editDescription.trim() || undefined,
                date: isNaN(parsedDate) ? Date.now() : parsedDate,
            },
            { contactId, notebookId }
        );
        setEditTarget(null);
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

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center transition-[padding] duration-200" style={keyboardOffsetStyle}>
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/40 backdrop-blur-sm ${isClosing ? "animate-fade-out" : "animate-fade-in"}`}
                onClick={handleAnimatedClose}
            />

            {/* Sheet */}
            <div className={`relative z-10 w-full sm:max-w-md h-[92dvh] sm:h-[92vh] flex flex-col liquid-glass-heavy rounded-t-3xl sm:rounded-3xl shadow-2xl ${isClosing ? "animate-sheet-down" : "animate-sheet-up"} overflow-hidden`}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-(--border)">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold truncate">{contactName}</h2>
                        <p
                            className={`text-sm font-semibold mt-0.5 ${balance > 0
                                ? "text-accent-500"
                                : balance < 0
                                    ? "text-danger-500"
                                    : "text-(--text-secondary)"
                                }`}
                        >
                            {mask(`${balance >= 0 ? "+" : ""}${balance.toFixed(2)} MAD`)}
                        </p>
                    </div>
                    <button
                        onClick={handleAnimatedClose}
                        className="p-2 rounded-xl liquid-glass hover:bg-white/10 transition-all cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Transaction List — merged timeline of transactions + experience cards sorted by date */}
                <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] px-5 py-4 space-y-2.5">
                    {!transactions ? (
                        <div className="text-center py-8 text-sm text-(--text-tertiary)">
                            {t("dashboard.loading")}
                        </div>
                    ) : transactions.length === 0 && !adding && (!experiences || experiences.length === 0) ? (
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
                            mask={mask}
                            isItemPending={isItemPending}
                            openEditTx={openEditTx}
                            setDeleteTargetId={setDeleteTargetId}
                            onExperienceClick={(expId) => {
                                handleAnimatedClose();
                                setTimeout(() => router.push(`/app/experiences?open=${expId}`), 350);
                            }}
                        />
                    )}
                </div>

                {/* Delete Confirmation Popup */}
                {deleteTargetId && createPortal(
                    <div className="fixed inset-0 z-[300] flex items-center justify-center transition-[padding] duration-200" style={keyboardOffsetStyle}>
                        <div
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
                            onClick={() => {
                                triggerHaptic("light");
                                setDeleteTargetId(null);
                            }}
                        />
                        <div className="relative z-10 w-[85%] max-w-xs liquid-glass-heavy rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
                            <div className="p-5 text-center">
                                <div className="inline-flex p-3 rounded-full bg-danger-500/10 mb-3">
                                    <Trash2 size={20} className="text-danger-500" />
                                </div>
                                <h3 className="text-sm font-bold mb-1">{t("transaction.delete")}</h3>
                                <p className="text-xs text-(--text-secondary)">
                                    {t("transaction.deleteConfirm")}
                                </p>
                            </div>
                            <div className="flex border-t border-(--border)">
                                <button
                                    onClick={() => {
                                        triggerHaptic("light");
                                        setDeleteTargetId(null);
                                    }}
                                    className="flex-1 py-3 text-sm font-medium text-(--text-secondary) transition-all active:bg-white/5 cursor-pointer"
                                >
                                    {t("common.cancel")}
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-3 text-sm font-semibold text-danger-500 border-l border-(--border) transition-all active:bg-danger-500/10 cursor-pointer"
                                >
                                    {t("common.delete")}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Edit Transaction Popup */}
                {editTarget && createPortal(
                    <div className="fixed inset-0 z-[300] flex items-center justify-center transition-[padding] duration-200" style={keyboardOffsetStyle}>
                        <div
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
                            onClick={() => {
                                triggerHaptic("light");
                                setEditTarget(null);
                            }}
                        />
                        <div className="relative z-10 w-[85%] max-w-xs liquid-glass-heavy rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
                            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-(--border)">
                                <h3 className="text-sm font-bold">{t("transaction.edit")}</h3>
                                <button
                                    onClick={() => {
                                        triggerHaptic("light");
                                        setEditTarget(null);
                                    }}
                                    className="p-1 rounded-lg active:bg-white/10 transition-all cursor-pointer"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditIsPositive(!editIsPositive);
                                            triggerHaptic("selection");
                                        }}
                                        className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${editIsPositive
                                            ? "bg-accent-500/15 text-accent-500 border border-accent-500/30"
                                            : "bg-danger-500/15 text-danger-500 border border-danger-500/30"
                                            }`}
                                    >
                                        {editIsPositive
                                            ? t("transaction.theyOweYou")
                                            : t("transaction.youOweThem")}
                                    </button>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        value={editAmount}
                                        onChange={(e) => setEditAmount(e.target.value)}
                                        placeholder={t("transaction.amount")}
                                        className="glass-input py-2 text-sm flex-1"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleEditTx();
                                        if (e.key === "Escape") setEditTarget(null);
                                    }}
                                    placeholder={t("transaction.description")}
                                    className="glass-input py-2 text-sm"
                                />
                                <input
                                    type="datetime-local"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="glass-input py-2 text-sm w-full min-w-0 appearance-none"
                                />
                            </div>
                            <div className="flex border-t border-(--border)">
                                <button
                                    onClick={() => {
                                        triggerHaptic("light");
                                        setEditTarget(null);
                                    }}
                                    className="flex-1 py-3 text-sm font-medium text-(--text-secondary) transition-all active:bg-white/5 cursor-pointer"
                                >
                                    {t("common.cancel")}
                                </button>
                                <button
                                    onClick={handleEditTx}
                                    disabled={!editAmount || parseFloat(editAmount) <= 0}
                                    className="flex-1 py-3 text-sm font-semibold text-primary-500 border-l border-(--border) transition-all active:bg-primary-500/10 disabled:opacity-40 cursor-pointer"
                                >
                                    {t("common.save")}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Add Transaction */}
                <div className="px-5 pb-5 pt-2 border-t border-(--border)">
                    {adding ? (
                        <div className="space-y-3 animate-scale-in">
                            {/* Amount + Direction Toggle */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setIsPositive(!isPositive);
                                        triggerHaptic("selection");
                                    }}
                                    className={`shrink-0 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isPositive
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
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleAdd();
                                    if (e.key === "Escape") setAdding(false);
                                }}
                                placeholder={t("transaction.description")}
                                className="glass-input py-2.5 text-sm"
                            />
                            <input
                                type="datetime-local"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="glass-input py-2.5 text-sm w-full min-w-0 appearance-none"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        triggerHaptic("light");
                                        setAdding(false);
                                    }}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-(--text-secondary) liquid-glass hover:bg-white/10 transition-all cursor-pointer"
                                >
                                    {t("common.cancel")}
                                </button>
                                <button
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
            </div>
        </div>,
        document.body
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
                        />
                    );
                }

                const tx = item.data as { _id: Id<"transactions">; amount: number; description?: string; date?: number; createdAt: number };
                return (
                    <div
                        key={tx._id}
                        className="liquid-glass-card p-3.5 flex items-center gap-3"
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
                                <p className="text-sm text-(--text-primary) truncate mt-0.5">
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
