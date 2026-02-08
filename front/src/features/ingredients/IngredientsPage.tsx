import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { MEASUREMENT_UNITS } from "../../constants/measurementUnits";
import { useTranslation } from "../../i18n";
import type { IngredientOption } from "../../types";
import { getIngredientOptionLabel } from "../../utils/ingredientNames";

interface IngredientsPageProps {
  ingredients: IngredientOption[];
  units: string[];
  onAddIngredient: (payload: { name: string; unit: string }) => void;
  onUpdateIngredient: (payload: { key: string; name: string; unit: string }) => void;
}

type Draft = { name: string; unit: string };

export function IngredientsPage({ ingredients, units, onAddIngredient, onUpdateIngredient }: IngredientsPageProps) {
  const { t, language } = useTranslation();
  const unitOptions = units.length ? units : MEASUREMENT_UNITS;
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<string>(unitOptions[0] ?? "");
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const collator = useMemo(() => new Intl.Collator(language), [language]);
  const optionLabel = useCallback(
    (ingredient: IngredientOption) => getIngredientOptionLabel(ingredient, language),
    [language],
  );

  const formatUnit = (value: string): string => {
    const label = t(`units.${value}`);
    return label.startsWith("units.") ? value : label;
  };

  const sortedIngredients = useMemo(
    () =>
      [...ingredients].sort((a, b) =>
        collator.compare(optionLabel(a) ?? a.name ?? "", optionLabel(b) ?? b.name ?? ""),
      ),
    [ingredients, collator, optionLabel],
  );

  useEffect(() => {
    const next: Record<string, Draft> = {};
    ingredients.forEach((ingredient) => {
      const unit = unitOptions.includes(ingredient.unit) ? ingredient.unit : unitOptions[0] ?? "";
      next[ingredient.key] = {
        name: ingredient.name,
        unit,
      };
    });
    setDrafts(next);
  }, [ingredients, unitOptions]);

  useEffect(() => {
    if (!unitOptions.length) return;
    if (!unitOptions.includes(unit)) {
      setUnit(unitOptions[0] ?? "");
    }
  }, [unitOptions, unit]);

  function resetForm() {
    setName("");
    setUnit(unitOptions[0] ?? "");
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("dishes.editor.ingredientEmpty"));
      return;
    }
    onAddIngredient({ name: trimmedName, unit });
    resetForm();
  }

  function resetDraftFromIngredient(ingredient: IngredientOption) {
    setDrafts((prev) => ({
      ...prev,
      [ingredient.key]: {
        name: ingredient.name,
        unit: ingredient.unit ?? unitOptions[0] ?? "",
      },
    }));
  }

  function commitDraft(ingredient: IngredientOption) {
    const draft = drafts[ingredient.key];
    if (!draft) return;

    const nextName = draft.name.trim() || ingredient.name;
    const nextUnit = draft.unit;

    if (nextName === ingredient.name && nextUnit === ingredient.unit) {
      resetDraftFromIngredient(ingredient);
      return;
    }

    onUpdateIngredient({ key: ingredient.key, name: nextName, unit: nextUnit });
    setDrafts((prev) => ({
      ...prev,
      [ingredient.key]: {
        name: nextName,
        unit: nextUnit,
      },
    }));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{t("ingredients.addHeading")}</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={handleSubmit}>
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
            <select
              id="ingredient-unit"
              className="w-full rounded-xl border px-3 py-2"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
            >
              {unitOptions.map((value) => (
                <option key={value} value={value}>
                  {formatUnit(value)}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1 flex flex-wrap items-end gap-3">
            <button
              type="submit"
              className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white sm:w-auto"
            >
              {t("ingredients.addButton")}
            </button>
            <button
              type="button"
              className="rounded-xl border px-3 py-2 text-sm font-medium sm:w-auto"
              onClick={resetForm}
            >
              {t("dishes.actions.cancel")}
            </button>
          </div>
          {error && (
            <div className="md:col-span-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
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
                </tr>
              </thead>
              <tbody>
                {sortedIngredients.map((ingredient) => {
                  const draft = drafts[ingredient.key] ?? {
                    name: ingredient.name,
                    unit: ingredient.unit ?? unitOptions[0] ?? "",
                  };
                  const localizedName = optionLabel(ingredient);
                  const showSecondary = localizedName && localizedName !== ingredient.name;
                  return (
                    <tr key={ingredient.key} className="border-b last:border-none">
                      <td className="py-2 pr-4 align-top">
                        <div className="text-xs text-gray-500">
                          {localizedName}
                          {showSecondary ? (
                            <span className="text-gray-400"> · {ingredient.name}</span>
                          ) : null}
                        </div>
                        <input
                          className="mt-1 w-full rounded-lg border px-2 py-1"
                          value={draft.name}
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [ingredient.key]: {
                                ...draft,
                                name: event.target.value,
                              },
                            }))
                          }
                          onBlur={() => commitDraft(ingredient)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              commitDraft(ingredient);
                            } else if (event.key === "Escape") {
                              event.preventDefault();
                              resetDraftFromIngredient(ingredient);
                            }
                          }}
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <select
                          className="w-full rounded-lg border px-2 py-1"
                          value={draft.unit}
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [ingredient.key]: {
                                ...draft,
                                unit: event.target.value,
                              },
                            }))
                          }
                          onBlur={() => commitDraft(ingredient)}
                        >
                          {unitOptions.map((value) => (
                            <option key={value} value={value}>
                              {formatUnit(value)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-4">{ingredient.usageCount ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
