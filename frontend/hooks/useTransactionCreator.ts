"use client";

import { useState } from "react";
import { toLocalDatetime } from "@/lib/dateUtils";
import { triggerHaptic } from "@/lib/haptics";

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
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) return;
        triggerHaptic("success");

        const parsedDate = date ? new Date(date).getTime() : Date.now();
        await onCreateTx({
            amount: isPositive ? parsedAmount : -parsedAmount,
            description: description.trim() || undefined,
            date: isNaN(parsedDate) ? Date.now() : parsedDate,
        });

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
