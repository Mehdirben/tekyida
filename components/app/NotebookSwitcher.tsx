"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Plus, BookOpen, Check, Pencil, Trash2, X, CloudOff, GripVertical, Archive, ArchiveRestore } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { triggerHaptic } from "@/lib/haptics";

interface Notebook {
    id: string;
    name: string;
    archived?: boolean;
}

interface NotebookSwitcherProps {
    notebooks: Notebook[];
    activeNotebookId?: string;
    onSelect?: (id: string) => void;
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

    const [isReordering, setIsReordering] = useState(false);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [localNotebooks, setLocalNotebooks] = useState<Notebook[]>([]);
    const [offsetY, setOffsetY] = useState(0);
    const dragStartYRef = useRef(0);
    const dragCurrentIndexRef = useRef<number | null>(null);

    const handleDragStart = (
        e: React.MouseEvent | React.TouchEvent,
        index: number,
        id: string
    ) => {
        triggerHaptic("light");
        setDraggedId(id);
        setDraggedIndex(index);
        dragCurrentIndexRef.current = index;
        setOffsetY(0);

        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
        dragStartYRef.current = clientY;
    };

    useEffect(() => {
        if (draggedId !== null && draggedIndex !== null) {
            const handleDragMove = (e: MouseEvent | TouchEvent) => {
                const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
                const deltaY = clientY - dragStartYRef.current;
                setOffsetY(deltaY);

                const itemHeight = 48; // Estimated height of a row
                const newIndex = Math.max(
                    0,
                    Math.min(
                        localNotebooks.length - 1,
                        Math.round(draggedIndex + deltaY / itemHeight)
                    )
                );

                if (newIndex !== dragCurrentIndexRef.current) {
                    triggerHaptic("light");
                    const updated = [...localNotebooks];
                    const [movedItem] = updated.splice(draggedIndex, 1);
                    updated.splice(newIndex, 0, movedItem);

                    const indexDiff = newIndex - draggedIndex;
                    dragStartYRef.current += indexDiff * itemHeight;

                    setLocalNotebooks(updated);
                    setDraggedIndex(newIndex);
                    dragCurrentIndexRef.current = newIndex;
                    setOffsetY(clientY - dragStartYRef.current);
                }
            };

            const handleDragEnd = () => {
                triggerHaptic("success");
                setDraggedId(null);
                setDraggedIndex(null);
                dragCurrentIndexRef.current = null;
                setOffsetY(0);

                const ids = localNotebooks.map((n) => n.id);
                onReorder?.(ids);
            };

            const onMove = (e: MouseEvent | TouchEvent) => {
                if (e.cancelable) e.preventDefault();
                handleDragMove(e);
            };
            const onEnd = () => {
                handleDragEnd();
            };

            window.addEventListener("mousemove", onMove, { passive: false });
            window.addEventListener("mouseup", onEnd);
            window.addEventListener("touchmove", onMove, { passive: false });
            window.addEventListener("touchend", onEnd);

            return () => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onEnd);
                window.removeEventListener("touchmove", onMove);
                window.removeEventListener("touchend", onEnd);
            };
        }
    }, [draggedId, draggedIndex, localNotebooks, onReorder]);

    const activeNotebooks = notebooks.filter((n) => !n.archived);
    const archivedNotebooks = notebooks.filter((n) => n.archived);
    const activeNotebook = notebooks.find((n) => n.id === activeNotebookId);
    const displayName = activeNotebook?.name || t("notebook.select");
    const deleteTarget = notebooks.find((n) => n.id === deleteTargetId);
    const archiveTarget = notebooks.find((n) => n.id === archiveTargetId);
    const unarchiveTarget = notebooks.find((n) => n.id === unarchiveTargetId);
    const displayNotebooks = isReordering ? localNotebooks : activeNotebooks;

    useBodyScrollLock(Boolean(deleteTarget) || Boolean(archiveTarget) || Boolean(unarchiveTarget));

    // Close dropdown on outside click, page scroll, or escape key
    useEffect(() => {
        let active = true;
        let scrollListenerAdded = false;

        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
                setAdding(false);
                setNewName("");
                setEditingId(null);
                setIsReordering(false);
            }
        }
        function handleScroll(e: Event) {
            if (dropdownRef.current && e.target instanceof Node && dropdownRef.current.contains(e.target)) {
                return;
            }
            if (dropdownRef.current?.contains(document.activeElement)) {
                return;
            }
            setOpen(false);
            setAdding(false);
            setNewName("");
            setEditingId(null);
            setIsReordering(false);
        }
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setOpen(false);
                setAdding(false);
                setNewName("");
                setEditingId(null);
                setIsReordering(false);
            }
        }
        if (open) {
            document.addEventListener("mousedown", handleClick);
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
                document.removeEventListener("keydown", handleKeyDown);
                if (scrollListenerAdded) {
                    window.removeEventListener("scroll", handleScroll, { capture: true });
                }
            };
        }
    }, [open]);

    // Focus input when adding
    useEffect(() => {
        if (adding && inputRef.current) inputRef.current.focus();
    }, [adding]);

    useEffect(() => {
        if (editingId && editInputRef.current) editInputRef.current.focus();
    }, [editingId]);

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

    return (
        <div ref={dropdownRef} className="relative inline-flex">
            {/* Trigger */}
            <button
                onClick={() => {
                    triggerHaptic("selection");
                    setOpen(!open);
                    setAdding(false);
                    setNewName("");
                    setEditingId(null);
                    setIsReordering(false);
                }}
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl cursor-pointer transition-all duration-300 active:scale-[0.97]"
                style={{
                    background: "var(--glass-bg-heavy)",
                    backdropFilter: "blur(32px) saturate(2)",
                    WebkitBackdropFilter: "blur(32px) saturate(2)",
                    border: "1px solid var(--glass-border)",
                    boxShadow: "0 4px 24px var(--glass-shadow), 0 1px 2px var(--glass-shadow), inset 0 1px 0 var(--glass-highlight)",
                }}
            >
                <BookOpen size={18} className="text-primary-500" />
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
                            displayNotebooks.map((notebook, index) => {
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
                                            onMouseDown={(e) => handleDragStart(e, index, notebook.id)}
                                            onTouchStart={(e) => handleDragStart(e, index, notebook.id)}
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
                                    <div key={notebook.id} className="px-3 py-2 flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                ref={editInputRef}
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                maxLength={20}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleEdit();
                                                    if (e.key === "Escape") {
                                                        e.stopPropagation();
                                                        setEditingId(null);
                                                    }
                                                }}
                                                className="glass-input py-1.5 pl-3 pr-11 text-sm w-full"
                                            />
                                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-(--text-tertiary) pointer-events-none select-none">
                                                {editName.length}/20
                                            </span>
                                        </div>
                                        <button
                                            onClick={handleEdit}
                                            disabled={!editName.trim()}
                                            className="p-1.5 rounded-lg bg-primary-800/80 dark:bg-primary-500/70 text-white disabled:opacity-40 cursor-pointer"
                                        >
                                            <Check size={14} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                triggerHaptic("light");
                                                setEditingId(null);
                                            }}
                                            className="p-1.5 rounded-lg text-(--text-tertiary) active:bg-white/10 cursor-pointer"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        key={notebook.id}
                                        className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 ${notebook.id === activeNotebookId
                                            ? "bg-primary-500/12 text-primary-700 dark:text-primary-300"
                                            : "text-(--text-primary)"
                                            }`}
                                    >
                                        <button
                                            onClick={() => {
                                                triggerHaptic("selection");
                                                onSelect?.(notebook.id);
                                                setOpen(false);
                                            }}
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
                    {showArchived && archivedNotebooks.length > 0 && (
                        <div className="border-t border-(--border)/30 mt-2 pt-1 bg-black/5 dark:bg-white/2 divide-y divide-(--border)/30">
                            <div className="px-4 pt-1.5 pb-2.5 text-[10px] font-bold uppercase tracking-wider text-(--text-tertiary) select-none">
                                {t("notebook.archivedSection")} ({archivedNotebooks.length})
                            </div>
                            {archivedNotebooks.map((notebook) => (
                                <div
                                    key={notebook.id}
                                    className="w-full flex items-center justify-between px-4 py-2.5 text-(--text-secondary) transition-all duration-200"
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <Archive size={14} className="shrink-0 text-(--text-tertiary)" />
                                        <span className="text-sm font-medium truncate flex-1 select-none">
                                            {notebook.name}
                                        </span>
                                        {isItemPending?.(notebook.id) && (
                                            <CloudOff size={11} className="text-warning-500 shrink-0" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                        {onArchive && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    triggerHaptic("warning");
                                                    setUnarchiveTargetId(notebook.id);
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
                                                triggerHaptic("warning");
                                                setDeleteTargetId(notebook.id);
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
                    )}
                </div>

                {/* Divider + Add section */}
                <div className="border-t border-(--border)">
                    {isReordering ? (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                triggerHaptic("selection");
                                setIsReordering(false);
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-center text-primary-600 dark:text-primary-400 hover:bg-primary-500/5 transition-all duration-200 cursor-pointer font-semibold text-sm"
                        >
                            <Check size={16} />
                            <span>{t("notebook.reorderDone")}</span>
                        </button>
                    ) : adding ? (
                        <div className="p-3 flex items-center gap-2">
                            <div className="relative flex-1">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    maxLength={20}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleAdd();
                                        if (e.key === "Escape") {
                                            e.stopPropagation();
                                            setAdding(false);
                                            setNewName("");
                                        }
                                    }}
                                    placeholder={t("notebook.namePlaceholder")}
                                    className="glass-input py-2 pl-3.5 pr-11 text-sm w-full"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-(--text-tertiary) pointer-events-none select-none">
                                    {newName.length}/20
                                </span>
                            </div>
                            <button
                                onClick={handleAdd}
                                disabled={!newName.trim()}
                                className="p-2 rounded-xl bg-primary-800/80 dark:bg-primary-500/70 text-white transition-all duration-200 disabled:opacity-40 cursor-pointer"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex divide-x divide-(--border)">
                            {archivedNotebooks.length > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        triggerHaptic("selection");
                                        setShowArchived(!showArchived);
                                    }}
                                    className={`px-4.5 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                                        showArchived
                                            ? "text-warning-500 bg-warning-500/12 dark:bg-warning-500/20"
                                            : "text-(--text-secondary) hover:text-warning-500 active:bg-white/5"
                                    }`}
                                    title={t("notebook.archivedSection")}
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

                                        setLocalNotebooks(activeNotebooks);
                                        setIsReordering(true);
                                    }}
                                    className="px-4 flex items-center justify-center text-(--text-secondary) active:text-primary-500 transition-all duration-200 cursor-pointer"
                                    title={t("notebook.reorder")}
                                >
                                    <GripVertical size={17} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Notebook Confirmation */}
            {deleteTarget && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
                        onClick={() => {
                            triggerHaptic("light");
                            setDeleteTargetId(null);
                        }}
                    />
                    <div className="relative z-10 w-[90%] max-w-sm liquid-glass-heavy rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
                        <div className="p-5 text-center">
                            <div className="inline-flex p-3 rounded-full bg-danger-500/10 mb-3">
                                <Trash2 size={22} className="text-danger-500" />
                            </div>
                            <h3 className="text-base font-bold mb-1">{t("notebook.delete")}</h3>
                            <p className="text-sm text-(--text-secondary)">
                                {t("notebook.deleteConfirm")}
                            </p>
                            <p className="text-sm font-semibold mt-2 break-words whitespace-normal">{deleteTarget.name}</p>
                        </div>
                        <div className="flex border-t border-(--border)">
                            <button
                                onClick={() => {
                                    triggerHaptic("light");
                                    setDeleteTargetId(null);
                                }}
                                className="flex-1 py-3.5 text-sm font-medium text-(--text-secondary) transition-all active:bg-white/5 cursor-pointer"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={() => {
                                    confirmDelete();
                                }}
                                className="flex-1 py-3.5 text-sm font-semibold text-danger-500 border-l border-(--border) transition-all active:bg-danger-500/10 cursor-pointer"
                            >
                                {t("common.delete")}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Archive Notebook Confirmation */}
            {archiveTarget && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
                        onClick={() => {
                            triggerHaptic("light");
                            setArchiveTargetId(null);
                        }}
                    />
                    <div className="relative z-10 w-[90%] max-w-sm liquid-glass-heavy rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
                        <div className="p-5 text-center">
                            <div className="inline-flex p-3 rounded-full bg-warning-500/10 mb-3">
                                <Archive size={22} className="text-warning-500" />
                            </div>
                            <h3 className="text-base font-bold mb-1">{t("notebook.archive")}</h3>
                            <p className="text-sm text-(--text-secondary)">
                                {t("notebook.archiveConfirm")}
                            </p>
                            <p className="text-sm font-semibold mt-2 break-words whitespace-normal">{archiveTarget.name}</p>
                        </div>
                        <div className="flex border-t border-(--border)">
                            <button
                                onClick={() => {
                                    triggerHaptic("light");
                                    setArchiveTargetId(null);
                                }}
                                className="flex-1 py-3.5 text-sm font-medium text-(--text-secondary) transition-all active:bg-white/5 cursor-pointer"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={() => {
                                    if (archiveTargetId) {
                                        triggerHaptic("success");
                                        onArchive?.(archiveTargetId, true);
                                        setArchiveTargetId(null);
                                        setOpen(false);
                                    }
                                }}
                                className="flex-1 py-3.5 text-sm font-semibold text-warning-500 border-l border-(--border) transition-all active:bg-warning-500/10 cursor-pointer"
                            >
                                {t("common.archive")}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Unarchive/Restore Notebook Confirmation */}
            {unarchiveTarget && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
                        onClick={() => {
                            triggerHaptic("light");
                            setUnarchiveTargetId(null);
                        }}
                    />
                    <div className="relative z-10 w-[90%] max-w-sm liquid-glass-heavy rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
                        <div className="p-5 text-center">
                            <div className="inline-flex p-3 rounded-full bg-primary-500/10 mb-3">
                                <ArchiveRestore size={22} className="text-primary-500" />
                            </div>
                            <h3 className="text-base font-bold mb-1">{t("notebook.unarchive")}</h3>
                            <p className="text-sm text-(--text-secondary)">
                                {t("notebook.unarchiveConfirm")}
                            </p>
                            <p className="text-sm font-semibold mt-2 break-words whitespace-normal">{unarchiveTarget.name}</p>
                        </div>
                        <div className="flex border-t border-(--border)">
                            <button
                                onClick={() => {
                                    triggerHaptic("light");
                                    setUnarchiveTargetId(null);
                                }}
                                className="flex-1 py-3.5 text-sm font-medium text-(--text-secondary) transition-all active:bg-white/5 cursor-pointer"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={() => {
                                    if (unarchiveTargetId) {
                                        triggerHaptic("success");
                                        onArchive?.(unarchiveTargetId, false);
                                        setUnarchiveTargetId(null);
                                        setOpen(false);
                                    }
                                }}
                                className="flex-1 py-3.5 text-sm font-semibold text-primary-500 border-l border-(--border) transition-all active:bg-primary-500/10 cursor-pointer"
                            >
                                {t("common.restore")}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
