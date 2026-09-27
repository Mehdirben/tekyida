"use client";

import type { RefObject } from "react";
import { Archive, ArchiveRestore, Trash2, CloudOff } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { triggerHaptic } from "@/lib/haptics";
import type { Notebook } from "./notebookTypes";

interface NotebookArchivedSectionProps {
    notebooks: Notebook[];
    activeNotebookId?: string;
    isItemPending?: (id: string) => boolean;
    onSelect: (id: string) => void;
    onUnarchive?: (id: string) => void;
    onDelete: (id: string) => void;
    sectionRef: RefObject<HTMLDivElement | null>;
}

export default function NotebookArchivedSection({
    notebooks,
    activeNotebookId,
    isItemPending,
    onSelect,
    onUnarchive,
    onDelete,
    sectionRef,
}: NotebookArchivedSectionProps) {
    const { t } = useTranslation();

    if (notebooks.length === 0) return null;

    return (
        <div
            ref={sectionRef}
            className="border-t border-(--border)/30 mt-2 pt-1 bg-black/5 dark:bg-white/2 divide-y divide-(--border)/30"
        >
            <div className="px-4 pt-1.5 pb-2.5 text-[10px] font-bold uppercase tracking-wider text-(--text-tertiary) select-none">
                {t("notebook.archivedSection")} ({notebooks.length})
            </div>
            {notebooks.map((notebook) => (
                <div
                    key={notebook.id}
                    className={`w-full flex items-center justify-between px-4 py-2.5 transition-all duration-200 ${notebook.id === activeNotebookId
                        ? "bg-primary-500/12 text-primary-700 dark:text-primary-300"
                        : "text-(--text-secondary)"
                        }`}
                >
                    <button
                        onClick={() => {
                            triggerHaptic("selection");
                            onSelect(notebook.id);
                        }}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                    >
                        <Archive size={14} className="shrink-0 text-(--text-tertiary)" />
                        <span className="text-sm font-medium truncate flex-1">
                            {notebook.name}
                        </span>
                        {isItemPending?.(notebook.id) && (
                            <CloudOff size={11} className="text-warning-500 shrink-0" />
                        )}
                    </button>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                        {onUnarchive && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUnarchive(notebook.id);
                                }}
                                className="p-1 rounded-md text-primary-600 hover:bg-primary-500/10 transition-all cursor-pointer"
                                title={t("notebook.unarchive")}
                            >
                                <ArchiveRestore size={13} />
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(notebook.id);
                            }}
                            className="p-1 rounded-md text-danger-500/60 hover:bg-danger-500/10 transition-all cursor-pointer"
                            title={t("notebook.delete")}
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
