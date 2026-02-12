"use client";

import { BookPlus } from "lucide-react";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/i18n/LanguageContext";

interface EmptyStateProps {
    onCreateNotebook?: () => void;
}

export default function EmptyState({ onCreateNotebook }: EmptyStateProps) {
    const { t } = useTranslation();

    return (
        <div className="liquid-glass-card p-10 sm:p-14 text-center max-w-lg mx-auto">
            {/* Icon */}
            <div className="inline-flex p-4 rounded-2xl liquid-glass mb-6">
                <BookPlus size={36} className="text-primary-500" />
            </div>

            {/* Text */}
            <h3 className="text-xl font-bold mb-2">
                <span className="gradient-text">{t("dashboard.empty.title")}</span>
            </h3>
            <p className="text-sm text-(--text-secondary) mb-8 leading-relaxed">
                {t("dashboard.empty.subtitle")}
            </p>

            {/* CTA */}
            <Button size="lg" onClick={onCreateNotebook}>
                <BookPlus size={18} />
                {t("dashboard.empty.cta")}
            </Button>
        </div>
    );
}
