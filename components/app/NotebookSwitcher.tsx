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
    onAdd?: () => void;
}

export default function NotebookSwitcher({
    notebooks,
    activeNotebookId,
    onSelect,
    onAdd,
}: NotebookSwitcherProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const activeNotebook = notebooks.find((n) => n.id === activeNotebookId);
    const displayName = activeNotebook?.name || t("notebook.select");

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) {
            document.addEventListener("mousedown", handleClick);
            return () => document.removeEventListener("mousedown", handleClick);
        }
    }, [open]);

    return (
        <div ref={dropdownRef} className="relative">
            {/* Trigger */}
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-4 py-2.5 liquid-glass-heavy rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg"
            >
                <BookOpen size={18} className="text-primary-500" />
                <span className="font-semibold text-sm truncate max-w-[200px]">
                    {displayName}
                </span>
                <ChevronDown
                    size={16}
                    className={`text-(--text-tertiary) transition-transform duration-200 ${open ? "rotate-180" : ""
                        }`}
                />
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute top-full left-0 mt-2 w-64 liquid-glass-heavy rounded-xl overflow-hidden shadow-xl animate-scale-in z-50">
                    {/* Notebook list */}
                    <div className="max-h-60 overflow-y-auto py-1">
                        {notebooks.length === 0 ? (
                            <p className="text-xs text-(--text-tertiary) text-center py-4 px-3">
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
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${notebook.id === activeNotebookId
                                            ? "bg-primary-500/10 text-primary-700 dark:text-primary-300"
                                            : "text-(--text-primary) hover:bg-white/15 dark:hover:bg-white/5"
                                        }`}
                                >
                                    <BookOpen size={15} className="shrink-0 text-(--text-tertiary)" />
                                    <span className="text-sm font-medium truncate flex-1">
                                        {notebook.name}
                                    </span>
                                    {notebook.id === activeNotebookId && (
                                        <Check size={14} className="text-primary-500 shrink-0" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>

                    {/* Divider + Add button */}
                    <div className="border-t border-(--border)">
                        <button
                            onClick={() => {
                                onAdd?.();
                                setOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-primary-500 hover:bg-primary-500/5 transition-colors cursor-pointer"
                        >
                            <Plus size={16} />
                            <span className="text-sm font-semibold">{t("notebook.add")}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
