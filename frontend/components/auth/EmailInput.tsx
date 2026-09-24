"use client";

import { Mail } from "lucide-react";

interface EmailInputProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export default function EmailInput({
    label,
    value,
    onChange,
    disabled = false,
    placeholder = "you@example.com",
}: EmailInputProps) {
    return (
        <div>
            <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 ml-1">
                {label}
            </label>
            <div className="relative">
                <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary) pointer-events-none"
                />
                <input
                    type="email"
                    className="glass-input pl-10"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required
                    disabled={disabled}
                    autoComplete="email"
                />
            </div>
        </div>
    );
}
