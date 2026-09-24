"use client";

import { ArrowRightLeft, BookOpen } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import SegmentedToggle from "./SegmentedToggle";

export default function TransferRedirectToggle() {
    const { t } = useTranslation();

    return (
        <SegmentedToggle<"stay" | "redirect">
            storageKey="tekyida-transfer-redirect"
            defaultValue="stay"
            options={[
                { value: "stay", icon: ArrowRightLeft, label: t("settings.transferStay") },
                { value: "redirect", icon: BookOpen, label: t("settings.transferRedirect") },
            ]}
        />
    );
}
