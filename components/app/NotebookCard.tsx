"use client";

import { BookOpen, Users, ChevronRight } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";

interface NotebookCardProps {
    name: string;
    contactCount: number;
    balance: number;
    onClick?: () => void;
}

export default function NotebookCard({
    name,
    contactCount,
    balance,
    onClick,
}: NotebookCardProps) {
    const { t } = useTranslation();

    const balanceColor =
        balance > 0
            ? "text-accent-500"
            : balance < 0
                ? "text-danger-500"
                : "text-(--text-primary)";

    const formatBalance = (amount: number) => {
        const sign = amount >= 0 ? "+" : "";
        return `${sign}${amount.toFixed(2)} MAD`;
    };

    return (
        <button
            onClick={onClick}
            className="liquid-glass-card p-5 w-full text-left flex items-center gap-4 group cursor-pointer"
        >
            {/* Icon */}
            <div className="p-2.5 rounded-xl liquid-glass shrink-0">
                <BookOpen size={20} className="text-primary-500" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{name}</p>
                <div className="flex items-center gap-3 mt-1">
                    <span className="inline-flex items-center gap-1 text-xs text-(--text-tertiary)">
                        <Users size={12} />
                        {contactCount} {t("notebook.contacts")}
                    </span>
                    <span className={`text-xs font-semibold ${balanceColor}`}>
                        {formatBalance(balance)}
                    </span>
                </div>
            </div>

            {/* Chevron */}
            <ChevronRight
                size={18}
                className="text-(--text-tertiary) group-hover:text-(--text-primary) transition-colors shrink-0"
            />
        </button>
    );
}
