"use client";

import { useState, useCallback, useEffect } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { toLocalDatetime } from "@/lib/dateUtils";
import { triggerHaptic } from "@/lib/haptics";

export interface EditableTransaction {
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
        const parsedAmount = parseFloat(editAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) return;
        triggerHaptic("success");

        const parsedDate = editDate ? new Date(editDate).getTime() : Date.now();
        await onSaveTx({
            id: editTarget._id,
            amount: editIsPositive ? parsedAmount : -parsedAmount,
            description: editDescription.trim() || undefined,
            date: isNaN(parsedDate) ? Date.now() : parsedDate,
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
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
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
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [deleteTargetId, setDeleteTargetId, txEditor, adding, onClose]);
}
