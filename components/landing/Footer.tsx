"use client";

import { Heart } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { useTranslation } from "@/i18n/LanguageContext";

export default function Footer() {
    const { t } = useTranslation();

    return (
        <footer className="landing-safe-footer relative pt-8">
            <div className="max-w-6xl mx-auto px-5 sm:px-8">
                <div className="liquid-glass-card rounded-2xl px-6 py-5">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <Logo size="sm" />

                        <div className="flex items-center gap-1.5 text-sm text-(--text-tertiary)">
                            <span>{t("footer.madeWith")}</span>
                            <Heart size={13} className="text-danger-500 fill-danger-500" />
                            <span>{t("footer.inMorocco")} 🇲🇦</span>
                        </div>

                        <p className="text-xs text-(--text-tertiary)">
                            © {new Date().getFullYear()} Tekyida
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
