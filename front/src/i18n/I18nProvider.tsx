import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { DEFAULT_LANGUAGE, languageOptions, translations } from "./translations";
import type { Language } from "./types";

type Replacements = Record<string, string | number>;

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, replacements?: Replacements) => string;
  languages: typeof languageOptions;
}

const STORAGE_KEY = "mealplanner_language";

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function getFromTree(language: Language, key: string): string | undefined {
  const path = key.split(".");
  let node: unknown = translations[language];
  for (const part of path) {
    if (node && typeof node === "object" && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === "string" ? node : undefined;
}

function format(template: string, replacements?: Replacements): string {
  if (!replacements) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, token) => {
    if (token in replacements) {
      return String(replacements[token]);
    }
    return match;
  });
}

function resolve(language: Language, key: string): string | undefined {
  const direct = getFromTree(language, key);
  if (direct) return direct;
  if (language !== DEFAULT_LANGUAGE) {
    return getFromTree(DEFAULT_LANGUAGE, key);
  }
  return undefined;
}

function detectInitialLanguage(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && isLanguage(stored)) {
    return stored;
  }
  return DEFAULT_LANGUAGE;
}

function isLanguage(value: string): value is Language {
  return value === "en" || value === "uk" || value === "pl";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => detectInitialLanguage());

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, language);
    }
  }, [language]);

  const translate = useCallback(
    (key: string, replacements?: Replacements) => {
      const template = resolve(language, key) ?? key;
      return format(template, replacements);
    },
    [language],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: translate,
      languages: languageOptions,
    }),
    [language, translate],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return ctx;
}
