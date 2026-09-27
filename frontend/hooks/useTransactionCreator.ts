"use client";

import { useState } from "react";
import { toLocalDatetime } from "@/lib/dateUtils";
import { triggerHaptic } from "@/lib/haptics";
import { parseTransactionForm } from "@/lib/transactionForm";

export function useTransactionCreator(
    onCreateTx: (args: {
        amount: number;
        description?: string;
        date: number;
    }) => Promise<void>
) {
    const [adding, setAdding] = useState(false);
    const [amount, setAmount] = useState("");
    const [isPositive, setIsPositive] = useState(true);
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(() => toLocalDatetime(Date.now()));

    const handleAdd = async () => {
        const parsed = parseTransactionForm(amount, isPositive, description, date);
        if (!parsed) return;
        triggerHaptic("success");

        await onCreateTx(parsed);

        setAmount("");
        setDescription("");
        setDate(toLocalDatetime(Date.now()));
        setAdding(false);
    };

    return {
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
    };
}
