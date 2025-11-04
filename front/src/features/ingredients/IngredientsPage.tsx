import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { MEASUREMENT_UNITS, type MeasurementUnit } from "../../constants/measurementUnits";
import { useTranslation } from "../../i18n";
import type { IngredientOption } from "../../types";

interface IngredientsPageProps {
  ingredients: IngredientOption[];
  onAddIngredient: (payload: { name: string; unit: MeasurementUnit }) => void;
  onUpdateIngredient: (payload: { key: string; name: string; unit: MeasurementUnit }) => void;
}

type Draft = { name: string; unit: MeasurementUnit };

export function IngredientsPage({ ingredients, onAddIngredient, onUpdateIngredient }: IngredientsPageProps) {
  const { t, language } = useTranslation();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<MeasurementUnit>(MEASUREMENT_UNITS[0]);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const collator = useMemo(() => new Intl.Collator(language), [language]);

  const formatUnit = (value: string): string => {
    const label = t(`units.${value}`);
    return label.startsWith("units.") ? value : label;
  };

  const sortedIngredients = useMemo(
    () => [...ingredients].sort((a, b) => collator.compare(a.name ?? "", b.name ?? "")),
    [ingredients, collator],
  );

  useEffect(() => {
    const next: Record<string, Draft> = {};
    ingredients.forEach((ingredient) => {
      const unit = MEASUREMENT_UNITS.includes(ingredient.unit as MeasurementUnit)
        ? (ingredient.unit as MeasurementUnit)
        : MEASUREMENT_UNITS[0];
      next[ingredient.key] = {
        name: ingredient.name,
        unit,
      };
    });
    setDrafts(next);
  }, [ingredients]);

  function resetForm() {
    setName("");
    setUnit(MEASUREMENT_UNITS[0]);
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
        unit: (ingredient.unit as MeasurementUnit) ?? MEASUREMENT_UNITS[0],
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
              onChange={(event) => setUnit(event.target.value as MeasurementUnit)}
            >
              {MEASUREMENT_UNITS.map((value) => (
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
                    unit: (ingredient.unit as MeasurementUnit) ?? MEASUREMENT_UNITS[0],
                  };
                  return (
                    <tr key={ingredient.key} className="border-b last:border-none">
                      <td className="py-2 pr-4">
                        <input
                          className="w-full rounded-lg border px-2 py-1"
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
                                unit: event.target.value as MeasurementUnit,
                              },
                            }))
                          }
                          onBlur={() => commitDraft(ingredient)}
                        >
                          {MEASUREMENT_UNITS.map((value) => (
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
