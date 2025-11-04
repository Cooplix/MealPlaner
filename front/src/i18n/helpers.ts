import { DEFAULT_LANGUAGE, translations } from "./translations";
import type { Language } from "./types";

export type Replacements = Record<string, string | number>;

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

export function formatTemplate(template: string, replacements?: Replacements): string {
  if (!replacements) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, token) => {
    if (token in replacements) {
      return String(replacements[token]);
    }
    return match;
  });
}

export function resolveTranslation(language: Language, key: string): string | undefined {
  const direct = getFromTree(language, key);
  if (direct) return direct;
  if (language !== DEFAULT_LANGUAGE) {
    return getFromTree(DEFAULT_LANGUAGE, key);
  }
  return undefined;
}

export function isLanguage(value: string): value is Language {
  return value === "en" || value === "uk" || value === "pl";
}

export function detectInitialLanguage(storageKey: string): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const stored = window.localStorage.getItem(storageKey);
  if (stored && isLanguage(stored)) {
    return stored;
  }
  return DEFAULT_LANGUAGE;
}
