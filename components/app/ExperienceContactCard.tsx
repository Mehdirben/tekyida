"use client";

import { Compass, ChevronRight, Lock } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useAmountsVisibility } from "@/contexts/AmountsVisibilityContext";
import type { Id } from "@/convex/_generated/dataModel";
import { triggerHaptic } from "@/lib/haptics";

interface ExperienceSummary {
    _id: Id<"experiences">;
    name: string;
    closed: boolean;
    balance: number;
    transactionCount: number;
    lastTransactionDate?: number;
}

interface ExperienceContactCardProps {
    experience: ExperienceSummary;
    onSelect: (experience: ExperienceSummary) => void;
}

export default function ExperienceContactCard({
    experience,
    onSelect,
}: ExperienceContactCardProps) {
    const { t } = useTranslation();
    const { mask } = useAmountsVisibility();

    const balanceColor =
        experience.balance > 0
            ? "text-accent-500"
            : experience.balance < 0
                ? "text-danger-500"
                : "text-(--text-secondary)";

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => {
                triggerHaptic("selection");
                onSelect(experience);
            }}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    triggerHaptic("selection");
                    onSelect(experience);
                }
            }}
            className="liquid-glass-card p-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all border border-primary-500/20"
        >
            <div className="p-1.5 rounded-lg bg-primary-500/10 shrink-0">
                <Compass size={14} className="text-primary-500" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold truncate">{experience.name}</p>
                    <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold bg-warning-500/15 text-warning-500">
                        <Lock size={8} />
                        {t("experience.closed")}
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-(--text-tertiary)">
                        {experience.transactionCount} {t("experience.transactions")}
                    </span>
                    {experience.lastTransactionDate && (
                        <span className="text-[10px] text-(--text-tertiary)">
                            {new Date(experience.lastTransactionDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                    )}
                </div>
            </div>
            <span className={`text-sm font-bold shrink-0 ${balanceColor}`}>
                {mask(`${experience.balance >= 0 ? "+" : ""}${experience.balance.toFixed(2)}`)}
            </span>
            <ChevronRight size={14} className="text-(--text-tertiary) shrink-0" />
        </div>
    );
}
