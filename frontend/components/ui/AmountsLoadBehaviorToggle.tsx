"use client";

import { EyeOff, History } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import SegmentedToggle from "./SegmentedToggle";

export default function AmountsLoadBehaviorToggle() {
    const { t } = useTranslation();

    return (
        <SegmentedToggle<"hidden" | "remember">
            storageKey="tekyida-amounts-load-behavior"
            defaultValue="hidden"
            options={[
                { value: "hidden", icon: EyeOff, label: t("settings.alwaysHidden") },
                { value: "remember", icon: History, label: t("settings.rememberLast") },
            ]}
        />
    );
}
