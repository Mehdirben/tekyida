"use client";
import { Compass, ChevronRight } from "lucide-react";
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
    mask?: (value: string) => string;
}

export default function ExperienceContactCard({
    experience,
    onSelect,
    mask: maskProp,
}: ExperienceContactCardProps) {
    const { t } = useTranslation();
    const { mask: globalMask } = useAmountsVisibility();
    const mask = maskProp ?? globalMask;

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
                <p className="text-xs font-semibold whitespace-normal break-words">{experience.name}</p>
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
