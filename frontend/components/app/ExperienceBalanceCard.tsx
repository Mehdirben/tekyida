"use client";

import { Compass, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useAmountsVisibility } from "@/contexts/AmountsVisibilityContext";
import { triggerHaptic } from "@/lib/haptics";
import { formatBalance, balanceColor } from "@/lib/money";

interface ExperienceBalanceCardProps {
    balance: number;
}

export default function ExperienceBalanceCard({ balance }: ExperienceBalanceCardProps) {
    const { t } = useTranslation();
    const { hidden, toggle, mask } = useAmountsVisibility();

    const accentColor = balanceColor(balance);

    return (
        <div className="liquid-glass-card p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl liquid-glass">
                <Compass size={20} className="text-primary-500" />
            </div>
            <div className="flex-1">
                <p className="text-xs font-medium text-(--text-tertiary) uppercase tracking-wider">
                    {t("experience.totalBalance")}
                </p>
                <p className={`text-xl font-bold mt-0.5 ${accentColor}`}>
                    {formatBalance(balance, mask)}
                </p>
            </div>
            <button
                onClick={() => {
                    toggle();
                    triggerHaptic("selection");
                }}
                className="p-2.5 rounded-xl liquid-glass active:bg-white/10 transition-all cursor-pointer"
                aria-label={hidden ? "Show amounts" : "Hide amounts"}
            >
                {hidden ? (
                    <EyeOff size={18} className="text-(--text-tertiary)" />
                ) : (
                    <Eye size={18} className="text-(--text-tertiary)" />
                )}
            </button>
        </div>
    );
}
