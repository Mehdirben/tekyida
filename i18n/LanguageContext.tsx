"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    type ReactNode,
} from "react";
import en, { type TranslationKey } from "./en";
import fr from "./fr";

type Language = "en" | "fr";

const translations = { en, fr } as const;

interface LanguageContextValue {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
    undefined
);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLangState] = useState<Language>("fr");

    const setLanguage = useCallback((lang: Language) => {
        setLangState(lang);
        localStorage.setItem("tekyida-lang", lang);
        document.documentElement.lang = lang;
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem("tekyida-lang") as Language | null;
        if (saved && (saved === "en" || saved === "fr")) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLangState(saved);
            document.documentElement.lang = saved;
        }
    }, []);

    const t = useCallback(
        (key: TranslationKey): string => {
            return translations[language][key] || key;
        },
        [language]
    );

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useTranslation() {
    const ctx = useContext(LanguageContext);
    if (!ctx)
        throw new Error("useTranslation must be used within LanguageProvider");
    return ctx;
}
