import type { IngredientOption } from "../types";
import type { Language } from "../i18n";

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function findIngredientOption(
  options: IngredientOption[],
  name: string,
  unit?: string,
): IngredientOption | undefined {
  const targetName = normalize(name);
  const targetUnit = normalize(unit);
  if (!targetName) return undefined;

  return options.find((option) => {
    const unitMatches = targetUnit ? normalize(option.unit) === targetUnit : true;
    if (!unitMatches) return false;

    if (normalize(option.name) === targetName) return true;
    const translations = option.translations ?? {};
    return Object.values(translations).some((value) => normalize(value) === targetName);
  });
}

export function getLocalizedIngredientName(
  options: IngredientOption[],
  language: Language,
  fallbackName: string,
  unit?: string,
): string {
  const option = findIngredientOption(options, fallbackName, unit);
  if (!option) return fallbackName;
  const localized = option.translations?.[language];
  if (localized && localized.trim().length > 0) {
    return localized;
  }
  return option.name ?? fallbackName;
}

export function getIngredientOptionLabel(option: IngredientOption, language: Language): string {
  const localized = option.translations?.[language];
  if (localized && localized.trim().length > 0) {
    return localized;
  }
  return option.name;
}
