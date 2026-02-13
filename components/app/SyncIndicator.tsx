"use client";

import { RefreshCw, Check, WifiOff, CloudUpload } from "lucide-react";
import { useSync } from "@/contexts/SyncContext";
import { useTranslation } from "@/i18n/LanguageContext";

export default function SyncIndicator() {
    const { status, pendingCount, flushQueue } = useSync();
    const { t } = useTranslation();

    if (status === "synced") {
        return null; // Don't show anything when synced
    }

    const config = {
        offline: {
            icon: WifiOff,
            label: t("sync.offline"),
            className: "bg-warning-500/15 text-warning-500 border-warning-500/30",
            spinning: false,
        },
        pending: {
            icon: CloudUpload,
            label: t("sync.pending").replace("{count}", String(pendingCount)),
            className: "bg-warning-500/15 text-warning-500 border-warning-500/30",
            spinning: false,
        },
        syncing: {
            icon: RefreshCw,
            label: t("sync.syncing"),
            className: "bg-primary-500/15 text-primary-500 border-primary-500/30",
            spinning: true,
        },
        synced: {
            icon: Check,
            label: t("sync.synced"),
            className: "bg-accent-500/15 text-accent-500 border-accent-500/30",
            spinning: false,
        },
    }[status];

    const Icon = config.icon;

    return (
        <button
            onClick={() => {
                if (status === "pending" || status === "offline") {
                    flushQueue();
                }
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all active:scale-95 cursor-pointer ${config.className}`}
            title={config.label}
        >
            <Icon
                size={12}
                strokeWidth={2.5}
                className={config.spinning ? "animate-spin" : ""}
            />
            <span className="max-w-[120px] truncate">{config.label}</span>
        </button>
    );
}
