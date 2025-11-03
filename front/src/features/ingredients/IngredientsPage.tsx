import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import { useTranslation } from "../../i18n";
import type { Language } from "../../i18n/types";
import type { IngredientOption } from "../../types";

interface IngredientsPageProps {
  ingredients: IngredientOption[];
  languages: Array<{ code: Language; label: string }>;
  onAddIngredient: (payload: {
    name: string;
    unit: string;
    translations: Partial<Record<Language, string>>;
  }) => void;
  onUpdateTranslation: (payload: {
    key: string;
    language: Language;
    value: string;
    name: string;
    unit: string;
  }) => void;
}

export function IngredientsPage({
  ingredients,
  languages,
  onAddIngredient,
  onUpdateTranslation,
}: IngredientsPageProps) {
  const { t, language } = useTranslation();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [translations, setTranslations] = useState<Record<Language, string>>(() =>
    Object.fromEntries(languages.map((lang) => [lang.code, ""])) as Record<Language, string>,
  );
  const [error, setError] = useState<string | null>(null);

  const collator = useMemo(() => new Intl.Collator(language), [language]);

  const sortedIngredients = useMemo(
    () =>
      [...ingredients].sort((a, b) => {
        const labelA = a.translations[language] ?? a.name;
        const labelB = b.translations[language] ?? b.name;
        return collator.compare(labelA, labelB);
      }),
    [ingredients, collator, language],
  );

  function resetForm() {
    setName("");
    setUnit("");
    setTranslations(Object.fromEntries(languages.map((lang) => [lang.code, ""])) as Record<
      Language,
      string
    >);
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedUnit = unit.trim();
    if (!trimmedName || !trimmedUnit) {
      setError(t("dishes.editor.ingredientEmpty"));
      return;
    }
    const payload: Partial<Record<Language, string>> = {};
    for (const lang of languages) {
      const value = translations[lang.code]?.trim();
      if (value) {
        payload[lang.code] = value;
      }
    }
    onAddIngredient({ name: trimmedName, unit: trimmedUnit, translations: payload });
    resetForm();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{t("ingredients.addHeading")}</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="block text-sm text-gray-600" htmlFor="ingredient-name">
              {t("ingredients.baseName")}
            </label>
            <input
              id="ingredient-name"
              className="w-full rounded-xl border px-3 py-2"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("dishes.editor.ingredientNamePlaceholder")}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm text-gray-600" htmlFor="ingredient-unit">
              {t("ingredients.unit")}
            </label>
            <input
              id="ingredient-unit"
              className="w-full rounded-xl border px-3 py-2"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              placeholder={t("dishes.editor.ingredientUnitPlaceholder")}
            />
          </div>
          <div className="md:col-span-2">
            <h3 className="text-sm font-medium text-gray-600">{t("ingredients.translationsHeading")}</h3>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              {languages.map((lang) => (
                <label key={lang.code} className="text-sm text-gray-600 space-y-1">
                  <span>{lang.label}</span>
                  <input
                    className="w-full rounded-xl border px-3 py-2"
                    value={translations[lang.code] ?? ""}
                    onChange={(event) =>
                      setTranslations((prev) => ({
                        ...prev,
                        [lang.code]: event.target.value,
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </div>
          {error && (
            <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="md:col-span-2 flex gap-3">
            <button
              type="submit"
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white"
            >
              {t("ingredients.addButton")}
            </button>
            <button
              type="button"
              className="rounded-xl border px-4 py-2 text-sm font-medium"
              onClick={resetForm}
            >
              {t("dishes.actions.cancel")}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{t("ingredients.title")}</h2>
        {sortedIngredients.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{t("ingredients.empty")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b text-gray-500">
                  <th className="py-2 pr-4">{t("ingredients.tableHeaders.ingredient")}</th>
                  <th className="py-2 pr-4">{t("ingredients.tableHeaders.unit")}</th>
                  <th className="py-2 pr-4">{t("ingredients.tableHeaders.usage")}</th>
                  {languages.map((lang) => (
                    <th key={lang.code} className="py-2 pr-4">
                      {lang.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedIngredients.map((ingredient) => (
                  <tr key={ingredient.key} className="border-b last:border-none">
                    <td className="py-2 pr-4">{ingredient.name}</td>
                    <td className="py-2 pr-4">{ingredient.unit}</td>
                    <td className="py-2 pr-4">{ingredient.usageCount ?? 0}</td>
                    {languages.map((lang) => (
                      <td key={lang.code} className="py-2 pr-4">
                        <input
                          className="w-full rounded-lg border px-2 py-1"
                          value={ingredient.translations[lang.code] ?? ""}
                          onChange={(event) =>
                            onUpdateTranslation({
                              key: ingredient.key,
                              language: lang.code,
                              value: event.target.value,
                              name: ingredient.name,
                              unit: ingredient.unit,
                            })
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
