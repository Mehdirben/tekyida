"use client";

import { useTranslation } from "@/i18n/LanguageContext";
import SegmentedToggle from "./SegmentedToggle";

export default function LanguageToggle() {
    const { language, setLanguage } = useTranslation();

    return (
        <SegmentedToggle<"fr" | "en">
            value={language}
            onChange={(next) => setLanguage(next)}
            options={[
                {
                    value: "fr",
                    label: "FR",
                    emoji: "🇫🇷",
                    ariaLabel: "Switch to FR",
                    labelMode: "sm",
                },
                {
                    value: "en",
                    label: "EN",
                    emoji: "🇬🇧",
                    ariaLabel: "Switch to EN",
                    labelMode: "sm",
                },
            ]}
        />
    );
}
