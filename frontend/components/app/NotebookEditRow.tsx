"use client";

import type { RefObject } from "react";
import { Check, X } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface NotebookEditRowProps {
    editName: string;
    onEditNameChange: (value: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
    inputRef: RefObject<HTMLInputElement | null>;
}

export default function NotebookEditRow({
    editName,
    onEditNameChange,
    onConfirm,
    onCancel,
    inputRef,
}: NotebookEditRowProps) {
    return (
        <div className="px-3 py-2 flex items-center gap-2">
            <div className="relative flex-1">
                <input
                    ref={inputRef}
                    type="text"
                    value={editName}
                    onChange={(e) => onEditNameChange(e.target.value)}
                    maxLength={20}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") onConfirm();
                        if (e.key === "Escape") {
                            e.stopPropagation();
                            onCancel();
                        }
                    }}
                    className="glass-input py-1.5 pl-3 pr-11 text-sm w-full"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-(--text-tertiary) pointer-events-none select-none">
                    {editName.length}/20
                </span>
            </div>
            <button
                onClick={onConfirm}
                disabled={!editName.trim()}
                className="p-1.5 rounded-lg bg-primary-800/80 dark:bg-primary-500/70 text-white disabled:opacity-40 cursor-pointer"
            >
                <Check size={14} />
            </button>
            <button
                onClick={() => {
                    triggerHaptic("light");
                    onCancel();
                }}
                className="p-1.5 rounded-lg text-(--text-tertiary) active:bg-white/10 cursor-pointer"
            >
                <X size={14} />
            </button>
        </div>
    );
}
