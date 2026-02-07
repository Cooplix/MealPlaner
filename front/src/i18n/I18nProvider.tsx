import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { I18nContext, type I18nContextValue } from "./context";
import { detectInitialLanguage, formatTemplate, resolveTranslation, type Replacements } from "./helpers";
import { languageOptions } from "./translations";
import type { Language } from "./types";

const STORAGE_KEY = "mealplanner_language";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => detectInitialLanguage(STORAGE_KEY));

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, language);
    }
  }, [language]);

  const translate = useCallback(
    (key: string, replacements?: Replacements) => {
      const template = resolveTranslation(language, key) ?? key;
      return formatTemplate(template, replacements);
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
