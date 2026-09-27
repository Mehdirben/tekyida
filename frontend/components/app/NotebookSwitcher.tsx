"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Plus, BookOpen, Check, Pencil, Trash2, CloudOff, GripVertical, Archive, ArchiveRestore } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useDragReorder } from "@/hooks/useDragReorder";
import { triggerHaptic } from "@/lib/haptics";
import NotebookConfirmModals from "./NotebookConfirmModals";
import NotebookArchivedSection from "./NotebookArchivedSection";
import NotebookEditRow from "./NotebookEditRow";
import NotebookAddPanel from "./NotebookAddPanel";
import type { Notebook } from "./notebookTypes";

interface NotebookSwitcherProps {
    notebooks: Notebook[];
    activeNotebookId?: string;
    onSelect?: (id: string | undefined) => void;
    onAdd?: (name: string) => void;
    onEdit?: (id: string, name: string) => void;
    onDelete?: (id: string) => void;
    onArchive?: (id: string, archived: boolean) => void;
    onReorder?: (ids: string[]) => void;
    isItemPending?: (id: string) => boolean;
}

export default function NotebookSwitcher({
    notebooks,
    activeNotebookId,
    onSelect,
    onAdd,
    onEdit,
    onDelete,
    onArchive,
    onReorder,
    isItemPending,
}: NotebookSwitcherProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);
    const [unarchiveTargetId, setUnarchiveTargetId] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);
    const archivedSectionRef = useRef<HTMLDivElement>(null);

    const {
        isReordering,
        items: reorderItems,
        draggedId,
        offsetY,
        beginReorder,
        stopReorder,
        startDrag,
    } = useDragReorder<Notebook>((items) => onReorder?.(items.map((n) => n.id)));

    const closeMenu = useCallback(() => {
        setOpen(false);
        setAdding(false);
        setNewName("");
        setEditingId(null);
        stopReorder();
    }, [stopReorder]);

    const activeNotebooks = notebooks.filter((n) => !n.archived);
    const archivedNotebooks = notebooks.filter((n) => n.archived);
    const activeNotebook = notebooks.find((n) => n.id === activeNotebookId);
    const displayName = activeNotebook?.name || t("notebook.select");
    const deleteTarget = notebooks.find((n) => n.id === deleteTargetId);
    const archiveTarget = notebooks.find((n) => n.id === archiveTargetId);
    const unarchiveTarget = notebooks.find((n) => n.id === unarchiveTargetId);
    const displayNotebooks = isReordering ? reorderItems : activeNotebooks;

    useBodyScrollLock(Boolean(deleteTarget) || Boolean(archiveTarget) || Boolean(unarchiveTarget));

    // Close dropdown on outside click, page scroll, or escape key
    useEffect(() => {
        let active = true;
        let scrollListenerAdded = false;

        function handleClick(e: MouseEvent | TouchEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                closeMenu();
            }
        }
        function handleScroll(e: Event) {
            if (dropdownRef.current && e.target instanceof Node && dropdownRef.current.contains(e.target)) {
                return;
            }
            if (dropdownRef.current?.contains(document.activeElement)) {
                return;
            }
            closeMenu();
        }
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                closeMenu();
            }
        }
        if (open) {
            document.addEventListener("mousedown", handleClick);
            document.addEventListener("touchstart", handleClick, { passive: true });
            document.addEventListener("keydown", handleKeyDown);

            // Add scroll listener with a small delay to avoid capturing the initial render/focus scroll
            const timer = setTimeout(() => {
                if (active) {
                    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
                    scrollListenerAdded = true;
                }
            }, 150);

            return () => {
                active = false;
                clearTimeout(timer);
                document.removeEventListener("mousedown", handleClick);
                document.removeEventListener("touchstart", handleClick);
                document.removeEventListener("keydown", handleKeyDown);
                if (scrollListenerAdded) {
                    window.removeEventListener("scroll", handleScroll, { capture: true });
                }
            };
        }
    }, [open, closeMenu]);

    // Focus input when adding
    useEffect(() => {
        if (adding && inputRef.current) inputRef.current.focus();
    }, [adding]);

    useEffect(() => {
        if (editingId && editInputRef.current) editInputRef.current.focus();
    }, [editingId]);

    // Scroll to archived section when expanded
    useEffect(() => {
        if (showArchived) {
            const timer = setTimeout(() => {
                archivedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [showArchived]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (deleteTargetId) {
                    triggerHaptic("light");
                    setDeleteTargetId(null);
                } else if (archiveTargetId) {
                    triggerHaptic("light");
                    setArchiveTargetId(null);
                } else if (unarchiveTargetId) {
                    triggerHaptic("light");
                    setUnarchiveTargetId(null);
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [deleteTargetId, archiveTargetId, unarchiveTargetId]);

    const selectNotebook = (id: string) => {
        triggerHaptic("selection");
        onSelect?.(id);
        setOpen(false);
    };

    const handleAdd = () => {
        const trimmed = newName.trim();
        if (trimmed) {
            triggerHaptic("success");
            onAdd?.(trimmed);
            setNewName("");
            setAdding(false);
            setOpen(false);
        }
    };

    const cancelAdd = () => {
        setAdding(false);
        setNewName("");
    };

    const startEdit = (notebook: Notebook) => {
        setEditingId(notebook.id);
        setEditName(notebook.name);
        setAdding(false);
    };

    const handleEdit = () => {
        if (!editingId || !editName.trim()) return;
        triggerHaptic("success");
        onEdit?.(editingId, editName.trim());
        setEditingId(null);
    };

    const confirmDelete = () => {
        if (!deleteTargetId) return;
        triggerHaptic("warning");
        onDelete?.(deleteTargetId);
        setDeleteTargetId(null);
        setOpen(false);
    };

    const confirmArchive = () => {
        if (!archiveTargetId) return;
        triggerHaptic("success");
        onArchive?.(archiveTargetId, true);
        setArchiveTargetId(null);
        setOpen(false);
    };

    const confirmUnarchive = () => {
        if (!unarchiveTargetId) return;
        triggerHaptic("success");
        onArchive?.(unarchiveTargetId, false);
        setUnarchiveTargetId(null);
        setOpen(false);
    };

    return (
        <div ref={dropdownRef} className="relative inline-flex">
            {/* Trigger */}
            <button
                onClick={() => {
                    triggerHaptic("selection");
                    closeMenu();
                    setOpen(!open);
                }}
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl cursor-pointer transition-all duration-300 active:scale-[0.97]"
                style={{
                    background: "var(--glass-bg-heavy)",
                    backdropFilter: "blur(32px) saturate(2)",
                    WebkitBackdropFilter: "blur(32px) saturate(2)",
                    border: "1px solid var(--glass-border)",
                    boxShadow: "0 4px 24px var(--glass-shadow), 0 1px 2px var(--glass-shadow), inset 0 1px 0 var(--glass-highlight)",
                    transform: "translate3d(0, 0, 0)",
                    backfaceVisibility: "hidden",
                }}
            >
                {activeNotebook?.archived ? (
                    <Archive size={18} className="text-warning-500" />
                ) : (
                    <BookOpen size={18} className="text-primary-500" />
                )}
                <span className="font-semibold text-sm truncate max-w-[200px]">
                    {displayName}
                </span>
                {activeNotebookId && isItemPending?.(activeNotebookId) && (
                    <CloudOff size={13} className="text-warning-500" />
                )}
                <ChevronDown
                    size={16}
                    className={`text-(--text-tertiary) transition-transform duration-300 ease-out ${open ? "rotate-180" : ""
                        }`}
                />
            </button>

            {/* Dropdown */}
            <div
                className={`absolute top-full right-0 mt-2 w-72 rounded-2xl overflow-hidden z-60 transition-all duration-300 ease-out origin-top-right ${open
                    ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
                    }`}
                style={{
                    background: "var(--dropdown-bg, rgba(255, 255, 255, 0.88))",
                    backdropFilter: "blur(40px) saturate(2)",
                    WebkitBackdropFilter: "blur(40px) saturate(2)",
                    border: "1px solid var(--glass-border)",
                    boxShadow: "0 12px 48px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 var(--glass-highlight)",
                    transform: "translate3d(0, 0, 0)",
                    backfaceVisibility: "hidden",
                }}
            >
                {/* Notebook list */}
                <div className="max-h-59 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]">
                    <div className="pt-2 after:content-[''] after:block after:h-2">
                        {displayNotebooks.length === 0 ? (
                            <p className="text-xs text-(--text-tertiary) text-center py-6 px-4">
                                {t("dashboard.empty.title")}
                            </p>
                        ) : isReordering ? (
                            reorderItems.map((notebook, index) => {
                                const isDraggingThis = draggedId === notebook.id;
                                return (
                                    <div
                                        key={notebook.id}
                                        className={`w-full flex items-center gap-3 px-4 py-3 select-none transition-all duration-200 ${isDraggingThis
                                            ? "bg-primary-500/12 text-primary-700 dark:text-primary-300 z-50 shadow-xl"
                                            : "text-(--text-primary)"
                                            }`}
                                        style={{
                                            transform: isDraggingThis ? `translateY(${offsetY}px)` : "none",
                                            zIndex: isDraggingThis ? 50 : 1,
                                            position: "relative",
                                            boxShadow: isDraggingThis ? "0 8px 24px rgba(0,0,0,0.12)" : "none",
                                            transition: isDraggingThis ? "none" : "transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                                        }}
                                    >
                                        <div
                                            onMouseDown={(e) => startDrag(e, index, notebook.id)}
                                            onTouchStart={(e) => startDrag(e, index, notebook.id)}
                                            className="p-1 -m-1 text-(--text-tertiary) cursor-grab active:cursor-grabbing shrink-0 touch-none"
                                        >
                                            <GripVertical size={16} />
                                        </div>
                                        <span className={`text-sm truncate flex-1 ${isDraggingThis
                                            ? "font-semibold text-primary-700 dark:text-primary-300"
                                            : "font-medium text-(--text-primary)"
                                            }`}>
                                            {notebook.name}
                                        </span>
                                    </div>
                                );
                            })
                        ) : (
                            displayNotebooks.map((notebook) =>
                                editingId === notebook.id ? (
                                    <NotebookEditRow
                                        key={notebook.id}
                                        editName={editName}
                                        onEditNameChange={setEditName}
                                        onConfirm={handleEdit}
                                        onCancel={() => setEditingId(null)}
                                        inputRef={editInputRef}
                                    />
                                ) : (
                                    <div
                                        key={notebook.id}
                                        className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 ${notebook.id === activeNotebookId
                                            ? "bg-primary-500/12 text-primary-700 dark:text-primary-300"
                                            : "text-(--text-primary)"
                                            }`}
                                    >
                                        <button
                                            onClick={() => selectNotebook(notebook.id)}
                                            className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                                        >
                                            <BookOpen size={16} className="shrink-0 text-(--text-tertiary)" />
                                            <span className="text-sm font-medium truncate flex-1">
                                                {notebook.name}
                                            </span>
                                            {isItemPending?.(notebook.id) && (
                                                <CloudOff size={13} className="text-warning-500 shrink-0" />
                                            )}
                                        </button>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    triggerHaptic("light");
                                                    startEdit(notebook);
                                                }}
                                                className="p-1 rounded-md text-(--text-tertiary) active:bg-white/10 transition-all cursor-pointer"
                                                title={t("notebook.edit")}
                                            >
                                                <Pencil size={12} />
                                            </button>
                                            {onArchive && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        triggerHaptic("warning");
                                                        setArchiveTargetId(notebook.id);
                                                    }}
                                                    className="p-1 rounded-md text-(--text-tertiary) active:bg-white/10 transition-all cursor-pointer"
                                                    title={t("notebook.archive")}
                                                >
                                                    <Archive size={12} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    triggerHaptic("warning");
                                                    setDeleteTargetId(notebook.id);
                                                }}
                                                className="p-1 rounded-md text-danger-500/60 active:bg-danger-500/10 transition-all cursor-pointer"
                                                title={t("notebook.delete")}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                )
                            )
                        )}
                    </div>

                    {/* Collapsible Archived Section inside scroll container */}
                    {showArchived && (
                        <NotebookArchivedSection
                            notebooks={archivedNotebooks}
                            activeNotebookId={activeNotebookId}
                            isItemPending={isItemPending}
                            onSelect={selectNotebook}
                            onUnarchive={onArchive ? (id) => {
                                triggerHaptic("warning");
                                setUnarchiveTargetId(id);
                            } : undefined}
                            onDelete={(id) => {
                                triggerHaptic("warning");
                                setDeleteTargetId(id);
                            }}
                            sectionRef={archivedSectionRef}
                        />
                    )}
                </div>

                {/* Divider + Add section */}
                <div className="border-t border-(--border) relative overflow-hidden transition-all duration-300 ease-out" style={{ height: isReordering ? "48px" : (adding ? "62px" : "48px") }}>
                    {isReordering ? (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                triggerHaptic("selection");
                                stopReorder();
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-center text-primary-600 dark:text-primary-400 hover:bg-primary-500/5 transition-all duration-200 cursor-pointer font-semibold text-sm"
                            tabIndex={0}
                        >
                            <Check size={16} />
                            <span>{t("notebook.reorderDone")}</span>
                        </button>
                    ) : (
                        <>
                            {/* normal footer buttons */}
                            <div className={`absolute inset-0 flex divide-x divide-(--border) transition-all duration-300 ease-out ${adding ? "opacity-0 translate-y-2 pointer-events-none scale-95" : "opacity-100 translate-y-0 scale-100"}`}>
                                {archivedNotebooks.length > 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            triggerHaptic("selection");
                                            const nextShow = !showArchived;
                                            setShowArchived(nextShow);
                                            if (!nextShow && activeNotebook?.archived) {
                                                const saved = localStorage.getItem("tekyida-active-notebook");
                                                onSelect?.(saved || undefined);
                                            }
                                        }}
                                        className={`px-4.5 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                                            showArchived
                                                ? "text-warning-500 bg-warning-500/12 dark:bg-warning-500/20"
                                                : "text-(--text-secondary) hover:text-warning-500 active:bg-white/5"
                                        }`}
                                        title={t("notebook.archivedSection")}
                                        tabIndex={adding ? -1 : 0}
                                    >
                                        {showArchived ? (
                                            <ArchiveRestore size={17} className="stroke-[2.25]" />
                                        ) : (
                                            <Archive size={17} />
                                        )}
                                    </button>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        triggerHaptic("selection");
                                        setAdding(true);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-primary-600 dark:text-primary-400 transition-all duration-200 cursor-pointer"
                                    tabIndex={adding ? -1 : 0}
                                >
                                    <Plus size={17} strokeWidth={2.5} />
                                    <span className="text-sm font-semibold">{t("notebook.add")}</span>
                                </button>
                                {activeNotebooks.length > 1 && onReorder && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            triggerHaptic("selection");

                                            // Lock the current active notebook in hooks state before reordering
                                            // so that shifting the first notebook doesn't change the displayed selection
                                            if (!activeNotebookId && activeNotebooks.length > 0) {
                                                onSelect?.(activeNotebooks[0].id);
                                            }

                                            beginReorder(activeNotebooks);
                                        }}
                                        className="px-4 flex items-center justify-center text-(--text-secondary) active:text-primary-500 transition-all duration-200 cursor-pointer"
                                        title={t("notebook.reorder")}
                                        tabIndex={adding ? -1 : 0}
                                    >
                                        <GripVertical size={17} />
                                    </button>
                                )}
                            </div>

                            {/* add input panel */}
                            <NotebookAddPanel
                                visible={adding}
                                newName={newName}
                                onNameChange={setNewName}
                                onConfirm={handleAdd}
                                onCancel={cancelAdd}
                                inputRef={inputRef}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Confirmation modals */}
            <NotebookConfirmModals
                deleteTarget={deleteTarget}
                archiveTarget={archiveTarget}
                unarchiveTarget={unarchiveTarget}
                onDeleteCancel={() => setDeleteTargetId(null)}
                onDeleteConfirm={confirmDelete}
                onArchiveCancel={() => setArchiveTargetId(null)}
                onArchiveConfirm={confirmArchive}
                onUnarchiveCancel={() => setUnarchiveTargetId(null)}
                onUnarchiveConfirm={confirmUnarchive}
            />
        </div>
    );
}
