"use client";

import { ArrowUpRight, ArrowDownLeft, TrendingUp, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useAmountsVisibility } from "@/contexts/AmountsVisibilityContext";

interface StatItem {
    label: string;
    value: string;
    icon: React.ReactNode;
    accent?: string;
}

interface QuickStatsProps {
    moneyGiven?: number;
    moneyOwed?: number;
    netBalance?: number;
}

export default function QuickStats({
    moneyGiven = 0,
    moneyOwed = 0,
    netBalance = 0,
}: QuickStatsProps) {
    const { t } = useTranslation();
    const { hidden, toggle, mask } = useAmountsVisibility();

    const formatAmount = (amount: number) => mask(`${amount.toFixed(2)} MAD`);

    const formatBalance = (amount: number) => {
        const sign = amount >= 0 ? "+" : "";
        return mask(`${sign}${amount.toFixed(2)} MAD`);
    };

    const stats: StatItem[] = [
        {
            label: t("dashboard.stats.moneyOwed"),
            value: formatAmount(moneyOwed),
            icon: <ArrowDownLeft size={20} className="text-accent-500" />,
            accent: "text-accent-500",
        },
        {
            label: t("dashboard.stats.moneyGiven"),
            value: formatAmount(moneyGiven),
            icon: <ArrowUpRight size={20} className="text-danger-500" />,
            accent: "text-danger-500",
        },
        {
            label: t("dashboard.stats.balance"),
            value: formatBalance(netBalance),
            icon: <TrendingUp size={20} className="text-primary-500" />,
            accent:
                netBalance > 0
                    ? "text-accent-500"
                    : netBalance < 0
                        ? "text-danger-500"
                        : "text-(--text-primary)",
        },
    ];

    const moneyCards = stats.slice(0, 2);
    const balanceCard = stats[2];

    return (
        <div className="space-y-4">
            {/* Money Given + Money Owed — side by side */}
            <div className="grid grid-cols-2 gap-3">
                {moneyCards.map((stat) => (
                    <div
                        key={stat.label}
                        className="liquid-glass-card p-4 flex flex-col items-start gap-2"
                    >
                        <div className="p-2 rounded-xl liquid-glass shrink-0">
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs font-medium text-(--text-tertiary) uppercase tracking-wider leading-tight">
                                {stat.label}
                            </p>
                            <p className={`text-lg sm:text-xl font-bold mt-1 ${stat.accent || ""}`}>
                                {stat.value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Net Balance — full width */}
            <div className="liquid-glass-card p-5 flex items-center gap-4">
                <div className="p-2.5 rounded-xl liquid-glass">
                    {balanceCard.icon}
                </div>
                <div className="flex-1">
                    <p className="text-xs font-medium text-(--text-tertiary) uppercase tracking-wider">
                        {balanceCard.label}
                    </p>
                    <p className={`text-xl font-bold mt-0.5 ${balanceCard.accent || ""}`}>
                        {balanceCard.value}
                    </p>
                </div>
                <button
                    onClick={toggle}
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
        </div>
    );
}
