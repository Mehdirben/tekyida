"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { useSync } from "@/contexts/SyncContext";

/**
 * Shared hook for notebook selection, CRUD, and active notebook persistence.
 * Used by both the Dashboard and Experiences pages.
 */
export function useActiveNotebook() {
    const notebooks = useCachedQuery<{ _id: Id<"notebooks">; name: string; contactCount: number; balance: number; order?: number; createdAt?: number }[]>("notebooks.list", api.notebooks.list, {});
    const createNotebook = useMutation(api.notebooks.create);
    const updateNotebook = useMutation(api.notebooks.update);
    const deleteNotebook = useMutation(api.notebooks.remove);
    const reorderNotebooks = useMutation(api.notebooks.reorder);
    const { offlineMutation, isItemPending } = useSync();

    const [activeNotebookId, setActiveNotebookIdRaw] = useState<Id<"notebooks"> | undefined>(() => {
        if (typeof window === "undefined") return undefined;
        const saved = localStorage.getItem("tekyida-active-notebook");
        return saved ? (saved as Id<"notebooks">) : undefined;
    });

    const setActiveNotebookId = useCallback((id: Id<"notebooks"> | undefined) => {
        setActiveNotebookIdRaw(id);
        if (id) {
            localStorage.setItem("tekyida-active-notebook", id);
        } else {
            localStorage.removeItem("tekyida-active-notebook");
        }
    }, []);


    // Auto-select first notebook when loaded
    const resolvedActiveId =
        activeNotebookId && notebooks?.some((n) => n._id === activeNotebookId)
            ? activeNotebookId
            : notebooks?.[0]?._id;

    const handleCreateNotebook = async (name: string) => {
        const id = await offlineMutation(
            "notebooks:create",
            createNotebook,
            { name }
        );
        if (id) setActiveNotebookId(id as Id<"notebooks">);
    };

    const handleEditNotebook = async (id: string, name: string) => {
        await offlineMutation(
            "notebooks:update",
            updateNotebook,
            { id: id as Id<"notebooks">, name }
        );
    };

    const handleDeleteNotebook = async (id: string) => {
        await offlineMutation(
            "notebooks:remove",
            deleteNotebook,
            { id: id as Id<"notebooks"> }
        );
        if (resolvedActiveId === id) {
            setActiveNotebookId(undefined);
        }
    };

    const handleReorderNotebooks = async (ids: string[]) => {
        await offlineMutation(
            "notebooks:reorder",
            reorderNotebooks,
            { ids: ids as Id<"notebooks">[] }
        );
    };

    const safeNotebooks = notebooks ?? [];
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

    return {
        notebooks,
        safeNotebooks,
        resolvedActiveId,
        setActiveNotebookId,
        handleCreateNotebook,
        handleEditNotebook,
        handleDeleteNotebook,
        handleReorderNotebooks,
        isItemPending,
        isOffline,
    };
}
