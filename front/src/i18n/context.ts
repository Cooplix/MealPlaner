import { createContext } from "react";

import { languageOptions } from "./translations";
import type { Language } from "./types";

export interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  languages: typeof languageOptions;
}

export const I18nContext = createContext<I18nContextValue | undefined>(undefined);
