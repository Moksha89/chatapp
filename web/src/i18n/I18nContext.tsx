import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, Language, languageNames, RTL_LANGUAGES } from './translations';
import { api } from '../services/api';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
  languages: typeof languageNames;
  isRTL: boolean;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  const isRTL = RTL_LANGUAGES.includes(language);
  const dir = isRTL ? 'rtl' : 'ltr';

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang && translations[savedLang]) {
      setLanguageState(savedLang);
    }
  }, []);

  // Apply RTL direction to document
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [dir, language]);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    try {
      await api.updatePrivacySettings({ language: lang });
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  }, []);

  const t = useCallback((key: string): string => {
    return translations[language][key] || translations['en'][key] || key;
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, languages: languageNames, isRTL, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
