"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSync } from "@/contexts/SyncContext";

export function useTransactionMutations() {
    const createTransaction = useMutation(api.transactions.create);
    const deleteTransaction = useMutation(api.transactions.remove);
    const updateTransaction = useMutation(api.transactions.update);
    const { offlineMutation, isItemPending } = useSync();

    return {
        createTransaction,
        deleteTransaction,
        updateTransaction,
        offlineMutation,
        isItemPending,
    };
}
