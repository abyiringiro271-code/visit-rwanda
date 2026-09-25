import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { translations, type TranslationKey, type Language } from './translations';

export type Lang = Language;

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: TranslationKey) => string;
}

const LangContext = createContext<LangContextValue | undefined>(undefined);

const STORAGE_KEY = 'visitrwanda-lang';

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en';
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'rw' ? 'rw' : 'en';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const setLang = (l: Lang) => setLangState(l);
  const toggle = () => setLangState((l) => (l === 'en' ? 'rw' : 'en'));

  const t = (key: TranslationKey): string => {
    return translations[lang][key] ?? translations.en[key] ?? key;
  };

  return (
    <LangContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}