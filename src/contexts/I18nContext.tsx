import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Language, TranslationKey } from '@/types';
import { translate } from '@/lib/i18n';

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  isKhmer: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('residence-lang');
    return (saved === 'km' || saved === 'en') ? saved : 'en';
  });

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('residence-lang', newLang);
  }, []);

  const t = useCallback((key: TranslationKey) => translate(lang, key), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    if (lang === 'km') {
      document.documentElement.classList.add('font-khmer');
    } else {
      document.documentElement.classList.remove('font-khmer');
    }
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, isKhmer: lang === 'km' }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
