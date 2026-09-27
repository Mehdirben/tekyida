"use client";

import type { RefObject } from "react";
import { Plus, X } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { triggerHaptic } from "@/lib/haptics";

interface NotebookAddPanelProps {
    visible: boolean;
    newName: string;
    onNameChange: (value: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
    inputRef: RefObject<HTMLInputElement | null>;
}

export default function NotebookAddPanel({
    visible,
    newName,
    onNameChange,
    onConfirm,
    onCancel,
    inputRef,
}: NotebookAddPanelProps) {
    const { t } = useTranslation();

    return (
        <div className={`absolute inset-0 p-3 flex items-center gap-2 transition-all duration-300 ease-out ${visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-2 pointer-events-none scale-95"}`}>
            <div className="relative flex-1">
                <input
                    ref={inputRef}
                    type="text"
                    value={newName}
                    onChange={(e) => onNameChange(e.target.value)}
                    maxLength={20}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") onConfirm();
                        if (e.key === "Escape") {
                            e.stopPropagation();
                            onCancel();
                        }
                    }}
                    placeholder={t("notebook.namePlaceholder")}
                    className="glass-input py-2 pl-3.5 pr-11 text-sm w-full"
                    tabIndex={visible ? 0 : -1}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-(--text-tertiary) pointer-events-none select-none">
                    {newName.length}/20
                </span>
            </div>
            <button
                onClick={onConfirm}
                disabled={!newName.trim()}
                className="p-2 rounded-xl bg-primary-800/80 dark:bg-primary-500/70 text-white transition-all duration-200 disabled:opacity-40 cursor-pointer shrink-0"
                tabIndex={visible ? 0 : -1}
            >
                <Plus size={16} />
            </button>
            <button
                onClick={() => {
                    triggerHaptic("light");
                    onCancel();
                }}
                className="p-2 rounded-xl text-(--text-tertiary) active:bg-white/10 transition-all cursor-pointer shrink-0"
                tabIndex={visible ? 0 : -1}
            >
                <X size={16} />
            </button>
        </div>
    );
}
