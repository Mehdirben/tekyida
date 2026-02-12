"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, BookOpen, Check } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";

interface Notebook {
    id: string;
    name: string;
}

interface NotebookSwitcherProps {
    notebooks: Notebook[];
    activeNotebookId?: string;
    onSelect?: (id: string) => void;
    onAdd?: (name: string) => void;
}

export default function NotebookSwitcher({
    notebooks,
    activeNotebookId,
    onSelect,
    onAdd,
}: NotebookSwitcherProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const activeNotebook = notebooks.find((n) => n.id === activeNotebookId);
    const displayName = activeNotebook?.name || t("notebook.select");

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
                setAdding(false);
                setNewName("");
            }
        }
        if (open) {
            document.addEventListener("mousedown", handleClick);
            return () => document.removeEventListener("mousedown", handleClick);
        }
    }, [open]);

    // Focus input when adding
    useEffect(() => {
        if (adding && inputRef.current) {
            inputRef.current.focus();
        }
    }, [adding]);

    const handleAdd = () => {
        const trimmed = newName.trim();
        if (trimmed) {
            onAdd?.(trimmed);
            setNewName("");
            setAdding(false);
            setOpen(false);
        }
    };

    return (
        <div ref={dropdownRef} className="relative inline-flex">
            {/* Trigger */}
            <button
                onClick={() => {
                    setOpen(!open);
                    if (open) {
                        setAdding(false);
                        setNewName("");
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
                <div className="max-h-60 overflow-y-auto py-2">
                    {notebooks.length === 0 ? (
                        <p className="text-xs text-(--text-tertiary) text-center py-6 px-4">
                            {t("dashboard.empty.title")}
                        </p>
                    ) : (
                        notebooks.map((notebook) => (
                            <button
                                key={notebook.id}
                                onClick={() => {
                                    onSelect?.(notebook.id);
                                    setOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 cursor-pointer ${notebook.id === activeNotebookId
                                    ? "bg-primary-500/12 text-primary-700 dark:text-primary-300"
                                    : "text-(--text-primary) hover:bg-black/5 dark:hover:bg-white/8"
                                    }`}
                            >
                                <BookOpen size={16} className="shrink-0 text-(--text-tertiary)" />
                                <span className="text-sm font-medium truncate flex-1">
                                    {notebook.name}
                                </span>
                                {notebook.id === activeNotebookId && (
                                    <Check size={15} className="text-primary-500 shrink-0" />
                                )}
                            </button>
                        ))
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
                                className="p-2 rounded-xl bg-primary-800/80 dark:bg-primary-500/70 text-white transition-all duration-200 hover:shadow-md disabled:opacity-40 cursor-pointer"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setAdding(true);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-primary-600 dark:text-primary-400 hover:bg-primary-500/8 transition-all duration-200 cursor-pointer"
                        >
                            <Plus size={17} strokeWidth={2.5} />
                            <span className="text-sm font-semibold">{t("notebook.add")}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
