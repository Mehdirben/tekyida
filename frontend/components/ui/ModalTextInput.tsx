"use client";

import type { RefObject } from "react";

interface ModalTextInputProps {
    value: string;
    onChange: (value: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
    placeholder?: string;
    type?: string;
    inputRef?: RefObject<HTMLInputElement | null>;
}

export default function ModalTextInput({
    value,
    onChange,
    onConfirm,
    onCancel,
    placeholder,
    type = "text",
    inputRef,
}: ModalTextInputProps) {
    return (
        <input
            ref={inputRef}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === "Enter") onConfirm();
                if (e.key === "Escape") {
                    e.stopPropagation();
                    onCancel();
                }
            }}
            placeholder={placeholder}
            className="glass-input py-2.5 text-sm"
        />
    );
}
