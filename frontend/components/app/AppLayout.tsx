"use client";

import type { ReactNode } from "react";
import CacheWarmer from "@/components/app/CacheWarmer";
import DashboardHeader from "@/components/app/DashboardHeader";
import type { useActiveNotebook } from "@/hooks/useActiveNotebook";

interface AppLayoutProps {
    notebookManager: ReturnType<typeof useActiveNotebook>;
    animateIn: boolean;
    children: ReactNode;
}

export default function AppLayout({ notebookManager, animateIn, children }: AppLayoutProps) {
    const {
        safeNotebooks,
        notebooks,
        resolvedActiveId,
        setActiveNotebookId,
        handleCreateNotebook,
        handleEditNotebook,
        handleDeleteNotebook,
        handleArchiveNotebook,
        handleReorderNotebooks,
        isItemPending,
    } = notebookManager;

    return (
        <>
            <CacheWarmer notebookIds={safeNotebooks.map((n) => n._id)} />
            <main className="app-safe-top flex-1 sm:px-6 pb-4 max-w-2xl mx-auto w-full">
                <DashboardHeader
                    animateIn={animateIn}
                    notebooks={notebooks}
                    activeNotebookId={resolvedActiveId}
                    onSelectNotebook={setActiveNotebookId}
                    onCreateNotebook={handleCreateNotebook}
                    onEditNotebook={handleEditNotebook}
                    onDeleteNotebook={handleDeleteNotebook}
                    onArchiveNotebook={handleArchiveNotebook}
                    onReorderNotebooks={handleReorderNotebooks}
                    isItemPending={isItemPending}
                />
                {children}
            </main>
        </>
    );
}
