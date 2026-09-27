"use client";

import { useState, useCallback } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { toLocalDatetime } from "@/lib/dateUtils";
import { triggerHaptic } from "@/lib/haptics";
import { parseTransactionForm } from "@/lib/transactionForm";
import { useEscapeCascade } from "@/hooks/useEscapeCascade";

interface EditableTransaction {
    _id: Id<"transactions">;
    amount: number;
    description?: string;
    date?: number;
    createdAt: number;
}

export function useTransactionEditor(
    onSaveTx: (args: {
        id: Id<"transactions">;
        amount: number;
        description?: string;
        date: number;
    }) => Promise<void>
) {
    const [editTarget, setEditTarget] = useState<EditableTransaction | null>(null);
    const [editAmount, setEditAmount] = useState("");
    const [editIsPositive, setEditIsPositive] = useState(true);
    const [editDescription, setEditDescription] = useState("");
    const [editDate, setEditDate] = useState("");
    const [isEditClosing, setIsEditClosing] = useState(false);

    const handleOpenEdit = useCallback((tx: EditableTransaction) => {
        setEditTarget(tx);
        setEditAmount(Math.abs(tx.amount).toString());
        setEditIsPositive(tx.amount >= 0);
        setEditDescription(tx.description || "");
        setEditDate(toLocalDatetime(tx.date ?? tx.createdAt));
        setIsEditClosing(false);
    }, []);

    const handleCloseEdit = useCallback(() => {
        triggerHaptic("light");
        setIsEditClosing(true);
        setTimeout(() => {
            setEditTarget(null);
            setIsEditClosing(false);
        }, 250);
    }, []);

    const handleSaveEdit = async () => {
        if (!editTarget) return;
        const parsed = parseTransactionForm(editAmount, editIsPositive, editDescription, editDate);
        if (!parsed) return;
        triggerHaptic("success");

        await onSaveTx({
            id: editTarget._id,
            ...parsed,
        });
        handleCloseEdit();
    };

    return {
        editTarget,
        setEditTarget,
        editAmount,
        setEditAmount,
        editIsPositive,
        setEditIsPositive,
        editDescription,
        setEditDescription,
        editDate,
        setEditDate,
        isEditClosing,
        handleOpenEdit,
        handleCloseEdit,
        handleSaveEdit,
    };
}

export function useTransactionSheetEscape({
    deleteTargetId,
    setDeleteTargetId,
    txEditor,
    adding,
    setAdding,
    onClose,
}: {
    deleteTargetId: unknown;
    setDeleteTargetId: (val: null) => void;
    txEditor: { editTarget: unknown; handleCloseEdit: () => void };
    adding: boolean;
    setAdding: (val: boolean) => void;
    onClose: () => void;
}) {
    useEscapeCascade(() => {
        if (deleteTargetId) {
            triggerHaptic("light");
            setDeleteTargetId(null);
        } else if (txEditor.editTarget) {
            txEditor.handleCloseEdit();
        } else if (adding) {
            triggerHaptic("light");
            setAdding(false);
        } else {
            onClose();
        }
    });
}
