"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Plus, BookOpen, Check, Pencil, Trash2, X, CloudOff } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { triggerHaptic } from "@/lib/haptics";

interface Notebook {
    id: string;
    name: string;
}

interface NotebookSwitcherProps {
    notebooks: Notebook[];
    activeNotebookId?: string;
    onSelect?: (id: string) => void;
    onAdd?: (name: string) => void;
    onEdit?: (id: string, name: string) => void;
    onDelete?: (id: string) => void;
    isItemPending?: (id: string) => boolean;
}

export default function NotebookSwitcher({
    notebooks,
    activeNotebookId,
    onSelect,
    onAdd,
    onEdit,
    onDelete,
    isItemPending,
}: NotebookSwitcherProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);

    const activeNotebook = notebooks.find((n) => n.id === activeNotebookId);
    const displayName = activeNotebook?.name || t("notebook.select");
    const deleteTarget = notebooks.find((n) => n.id === deleteTargetId);

    useBodyScrollLock(Boolean(deleteTarget));

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
                setAdding(false);
                setNewName("");
                setEditingId(null);
            }
        }
        if (open) {
            document.addEventListener("mousedown", handleClick);
            return () => document.removeEventListener("mousedown", handleClick);
        }
    }, [open]);

    // Focus input when adding
    useEffect(() => {
        if (adding && inputRef.current) inputRef.current.focus();
    }, [adding]);

    useEffect(() => {
        if (editingId && editInputRef.current) editInputRef.current.focus();
    }, [editingId]);

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
                    if (open) {
                        setAdding(false);
                        setNewName("");
                        setEditingId(null);
                    }
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
                <div className="max-h-60 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] py-2">
                    {notebooks.length === 0 ? (
                        <p className="text-xs text-(--text-tertiary) text-center py-6 px-4">
                            {t("dashboard.empty.title")}
                        </p>
                    ) : (
                        notebooks.map((notebook) =>
                            editingId === notebook.id ? (
                                <div key={notebook.id} className="px-3 py-2 flex items-center gap-2">
                                    <input
                                        ref={editInputRef}
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleEdit();
                                            if (e.key === "Escape") setEditingId(null);
                                        }}
                                        className="glass-input py-1.5 text-sm flex-1"
                                    />
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
                                        {notebook.id === activeNotebookId && (
                                            <Check size={15} className="text-primary-500 shrink-0" />
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
                                        >
                                            <Pencil size={12} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                triggerHaptic("warning");
                                                setDeleteTargetId(notebook.id);
                                            }}
                                            className="p-1 rounded-md text-danger-500/60 active:bg-danger-500/10 transition-all cursor-pointer"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            )
                        )
                    )}
                </div>

                {/* Divider + Add section */}
                <div className="border-t border-(--border)">
                    {adding ? (
                        <div className="p-3 flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleAdd();
                                    if (e.key === "Escape") {
                                        setAdding(false);
                                        setNewName("");
                                    }
                                }}
                                placeholder={t("notebook.namePlaceholder")}
                                className="glass-input py-2 text-sm flex-1"
                            />
                            <button
                                onClick={handleAdd}
                                disabled={!newName.trim()}
                                className="p-2 rounded-xl bg-primary-800/80 dark:bg-primary-500/70 text-white transition-all duration-200 disabled:opacity-40 cursor-pointer"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                triggerHaptic("selection");
                                setAdding(true);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-primary-600 dark:text-primary-400 transition-all duration-200 cursor-pointer"
                        >
                            <Plus size={17} strokeWidth={2.5} />
                            <span className="text-sm font-semibold">{t("notebook.add")}</span>
                        </button>
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
                            <p className="text-sm font-semibold mt-2">{deleteTarget.name}</p>
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
        </div>
    );
}
