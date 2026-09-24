"use client";

import Logo from "@/components/ui/Logo";
import SyncIndicator from "@/components/app/SyncIndicator";
import NotebookSwitcher from "@/components/app/NotebookSwitcher";
import type { Id } from "@/convex/_generated/dataModel";

interface NotebookItem {
    _id: Id<"notebooks">;
    name: string;
    archived?: boolean;
}

interface DashboardHeaderProps {
    animateIn: boolean;
    notebooks?: NotebookItem[];
    activeNotebookId?: Id<"notebooks">;
    onSelectNotebook: (id?: Id<"notebooks">) => void;
    onCreateNotebook: (name: string) => void;
    onEditNotebook: (id: Id<"notebooks">, name: string) => void;
    onDeleteNotebook: (id: Id<"notebooks">) => void;
    onArchiveNotebook: (id: Id<"notebooks">, archived: boolean) => void;
    onReorderNotebooks: (ids: Id<"notebooks">[]) => void;
    isItemPending?: (itemType: string, itemId: string) => boolean;
}

export default function DashboardHeader({
    animateIn,
    notebooks,
    activeNotebookId,
    onSelectNotebook,
    onCreateNotebook,
    onEditNotebook,
    onDeleteNotebook,
    onArchiveNotebook,
    onReorderNotebooks,
    isItemPending,
}: DashboardHeaderProps) {
    return (
        <div className={`mb-6 ${animateIn ? "animate-slide-up" : ""} flex items-center justify-between relative z-50`}>
            <div className="flex items-center gap-2">
                <Logo size="md" />
                <SyncIndicator />
            </div>
            <NotebookSwitcher
                notebooks={
                    notebooks
                        ? notebooks.map((n) => ({
                              id: n._id,
                              name: n.name,
                              archived: n.archived,
                          }))
                        : []
                }
                activeNotebookId={activeNotebookId}
                onSelect={(id) => onSelectNotebook(id ? (id as Id<"notebooks">) : undefined)}
                onAdd={onCreateNotebook}
                onEdit={(id, name) => onEditNotebook(id as Id<"notebooks">, name)}
                onDelete={(id) => onDeleteNotebook(id as Id<"notebooks">)}
                onArchive={(id, archived) => onArchiveNotebook(id as Id<"notebooks">, archived)}
                onReorder={(ids) => onReorderNotebooks(ids as Id<"notebooks">[])}
                isItemPending={isItemPending ? (id) => isItemPending("notebooks", id) : undefined}
            />
        </div>
    );
}
