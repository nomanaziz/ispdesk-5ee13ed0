import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "bn" | "en";

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (bn: string, en: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = "ispdesk-lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "bn";
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "en" || saved === "bn" ? saved : "bn";
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {}
  }, [lang]);

  const setLang = (l: Lang) => setLangState(l);
  const t = (bn: string, en: string) => (lang === "bn" ? bn : en);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Safe fallback so non-wrapped consumers still render
    return {
      lang: "bn" as Lang,
      setLang: () => {},
      t: (bn: string, _en: string) => bn,
    };
  }
  return ctx;
}
