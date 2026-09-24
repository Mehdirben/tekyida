"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

interface PasswordInputProps {
    id?: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    autoComplete?: string;
}

export default function PasswordInput({
    id,
    label,
    value,
    onChange,
    placeholder = "••••••••",
    disabled = false,
    required = true,
    autoComplete = "current-password",
}: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div>
            <label htmlFor={id} className="block text-xs font-semibold text-(--text-secondary) mb-1.5 ml-1">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type={showPassword ? "text" : "password"}
                    className="glass-input pl-10 pr-10"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required={required}
                    disabled={disabled}
                    autoComplete={autoComplete}
                />
                <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary) pointer-events-none"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-(--text-tertiary) hover:text-(--text-primary) transition-colors"
                    tabIndex={-1}
                >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
        </div>
    );
}
