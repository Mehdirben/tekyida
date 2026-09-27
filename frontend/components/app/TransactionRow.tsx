"use client";

import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2, CloudOff } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { triggerHaptic } from "@/lib/haptics";
import { formatDate } from "@/lib/dateUtils";

export interface TransactionRowData {
    _id: Id<"transactions">;
    amount: number;
    description?: string;
    date?: number;
    createdAt: number;
}

interface TransactionRowProps {
    transaction: TransactionRowData;
    mask: (value: string) => string;
    isPending: boolean;
    onEdit?: (tx: TransactionRowData) => void;
    onDelete?: (id: Id<"transactions">) => void;
}

export default function TransactionRow({
    transaction: tx,
    mask,
    isPending,
    onEdit,
    onDelete,
}: TransactionRowProps) {
    return (
        <div
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
                {isPending && (
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
                {onEdit && (
                    <button
                        onClick={() => {
                            onEdit(tx);
                        }}
                        className="p-1 rounded-md text-(--text-tertiary) active:bg-white/10 transition-all cursor-pointer"
                    >
                        <Pencil size={12} />
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={() => {
                            triggerHaptic("warning");
                            onDelete(tx._id);
                        }}
                        className="p-1 rounded-md text-danger-500/60 active:bg-danger-500/10 transition-all cursor-pointer"
                    >
                        <Trash2 size={12} />
                    </button>
                )}
            </div>
        </div>
    );
}
