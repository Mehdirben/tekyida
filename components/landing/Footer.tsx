"use client";

import { Heart } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { useTranslation } from "@/i18n/LanguageContext";

export default function Footer() {
    const { t } = useTranslation();

    return (
        <footer className="border-t border-[var(--border)] py-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    {/* Logo + tagline */}
                    <div className="flex flex-col items-center sm:items-start gap-2">
                        <Logo size="sm" />
                        <p className="text-sm text-[var(--text-tertiary)]">
                            {t("footer.tagline")}
                        </p>
                    </div>

                    {/* Made with love */}
                    <div className="flex items-center gap-1.5 text-sm text-[var(--text-tertiary)]">
                        <span>{t("footer.madeWith")}</span>
                        <Heart
                            size={14}
                            className="text-danger-500 fill-danger-500"
                        />
                        <span>{t("footer.inMorocco")} 🇲🇦</span>
                    </div>
                </div>

                {/* Copyright */}
                <div className="mt-8 pt-6 border-t border-[var(--border)] text-center">
                    <p className="text-xs text-[var(--text-tertiary)]">
                        © {new Date().getFullYear()} Tekyida. {t("footer.rights")}
                    </p>
                </div>
            </div>
        </footer>
    );
}
