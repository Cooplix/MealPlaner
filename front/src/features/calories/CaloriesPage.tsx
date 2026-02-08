import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { MEASUREMENT_UNITS } from "../../constants/measurementUnits";
import { useTranslation } from "../../i18n";
import type { CalorieEntry, IngredientOption } from "../../types";
import { getIngredientOptionLabel } from "../../utils/ingredientNames";

interface CaloriesPageProps {
  ingredients: IngredientOption[];
  entries: CalorieEntry[];
  units: string[];
  onAddEntry: (payload: {
    ingredientKey: string;
    amount: number;
    unit: string;
    calories: number;
  }) => void;
  onUpdateEntry: (payload: {
    id: string;
    ingredientKey?: string;
    amount?: number;
    unit?: string;
    calories?: number;
  }) => void;
}

type Draft = {
  ingredientKey: string;
  amount: string;
  unit: string;
  calories: string;
};

export function CaloriesPage({ ingredients, entries, units, onAddEntry, onUpdateEntry }: CaloriesPageProps) {
  const { t, language } = useTranslation();
  const unitOptions = units.length ? units : Array.from(MEASUREMENT_UNITS);
  const [ingredientKey, setIngredientKey] = useState<string>("");
  const [amount, setAmount] = useState<string>("100");
  const [unit, setUnit] = useState<string>(unitOptions[0] ?? "");
  const [calories, setCalories] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const ingredientMap = useMemo(() => new Map(ingredients.map((item) => [item.key, item])), [ingredients]);
  const optionLabel = useCallback(
    (option: IngredientOption | undefined) => (option ? getIngredientOptionLabel(option, language) : undefined),
    [language],
  );
  const entryLabel = useCallback(
    (entry: CalorieEntry) => optionLabel(ingredientMap.get(entry.ingredientKey)) ?? entry.ingredientName,
    [ingredientMap, optionLabel],
  );

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => {
      const nameA = entryLabel(a).toLocaleLowerCase(language);
      const nameB = entryLabel(b).toLocaleLowerCase(language);
      if (nameA === nameB) {
        return a.unit.localeCompare(b.unit);
      }
      return nameA.localeCompare(nameB);
    }),
    [entries, language, entryLabel],
  );

  const formatUnit = (value: string): string => {
    const label = t(`units.${value}`);
    return label.startsWith("units.") ? value : label;
  };

  useEffect(() => {
    if (ingredientKey && ingredientMap.has(ingredientKey)) return;
    setIngredientKey(ingredients[0]?.key ?? "");
  }, [ingredients, ingredientKey, ingredientMap]);

  useEffect(() => {
    const next: Record<string, Draft> = {};
    entries.forEach((entry) => {
      next[entry.id] = {
        ingredientKey: entry.ingredientKey,
        amount: String(entry.amount),
        unit: entry.unit ?? unitOptions[0] ?? "",
        calories: String(entry.calories),
      };
    });
    setDrafts(next);
  }, [entries, unitOptions]);

  useEffect(() => {
    if (!unitOptions.length) return;
    if (!unitOptions.includes(unit)) {
      setUnit(unitOptions[0] ?? "");
    }
  }, [unitOptions, unit]);

  function resetForm() {
    setIngredientKey(ingredients[0]?.key ?? "");
    setAmount("100");
    setUnit(unitOptions[0] ?? "");
    setCalories("");
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ingredientKey) {
      setError(t("calories.validation.selectIngredient"));
      return;
    }
    const parsedAmount = Number.parseFloat(amount.replace(",", "."));
    const parsedCalories = Number.parseFloat(calories.replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(t("calories.validation.amount"));
      return;
    }
    if (!Number.isFinite(parsedCalories) || parsedCalories < 0) {
      setError(t("calories.validation.calories"));
      return;
    }
    onAddEntry({ ingredientKey, amount: parsedAmount, unit, calories: parsedCalories });
    resetForm();
  }

  function resetDraft(entry: CalorieEntry) {
    setDrafts((prev) => ({
      ...prev,
      [entry.id]: {
        ingredientKey: entry.ingredientKey,
        amount: String(entry.amount),
        unit: entry.unit ?? unitOptions[0] ?? "",
        calories: String(entry.calories),
      },
    }));
  }

  function commitDraft(entry: CalorieEntry) {
    const draft = drafts[entry.id];
    if (!draft) return;

    const nextKey = draft.ingredientKey || entry.ingredientKey;
    const parsedAmount = Number.parseFloat(draft.amount.replace(",", "."));
    const parsedCalories = Number.parseFloat(draft.calories.replace(",", "."));

    if (
      nextKey === entry.ingredientKey &&
      draft.unit === entry.unit &&
      Number.isFinite(parsedAmount) && parsedAmount === entry.amount &&
      Number.isFinite(parsedCalories) && parsedCalories === entry.calories
    ) {
      resetDraft(entry);
      return;
    }

    const payload: {
      id: string;
      ingredientKey?: string;
      amount?: number;
      unit?: string;
      calories?: number;
    } = { id: entry.id };

    if (nextKey !== entry.ingredientKey) {
      payload.ingredientKey = nextKey;
    }
    if (Number.isFinite(parsedAmount) && parsedAmount > 0 && parsedAmount !== entry.amount) {
      payload.amount = parsedAmount;
    }
    if (draft.unit !== entry.unit) {
      payload.unit = draft.unit;
    }
    if (Number.isFinite(parsedCalories) && parsedCalories >= 0 && parsedCalories !== entry.calories) {
      payload.calories = parsedCalories;
    }

    onUpdateEntry(payload);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{t("calories.addHeading")}</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-5" onSubmit={handleSubmit}>
          <div className="space-y-1 md:col-span-2">
            <label className="block text-sm text-gray-600" htmlFor="calorie-ingredient">
              {t("calories.ingredient")}
            </label>
            <select
              id="calorie-ingredient"
              className="w-full rounded-xl border px-3 py-2"
              value={ingredientKey}
              onChange={(event) => setIngredientKey(event.target.value)}
              disabled={!ingredients.length}
            >
              {ingredients.map((ingredient) => (
                <option key={ingredient.key} value={ingredient.key}>
                  {optionLabel(ingredient) ?? ingredient.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm text-gray-600" htmlFor="calorie-amount">
              {t("calories.amount")}
            </label>
            <input
              id="calorie-amount"
              type="number"
              min="0"
              step="any"
              className="w-full rounded-xl border px-3 py-2"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm text-gray-600" htmlFor="calorie-unit">
              {t("calories.unit")}
            </label>
            <select
              id="calorie-unit"
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
          <div className="space-y-1">
            <label className="block text-sm text-gray-600" htmlFor="calorie-value">
              {t("calories.calories")}
            </label>
            <input
              id="calorie-value"
              type="number"
              min="0"
              step="any"
              className="w-full rounded-xl border px-3 py-2"
              value={calories}
              onChange={(event) => setCalories(event.target.value)}
            />
          </div>
          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="rounded-xl border border-gray-900 bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              disabled={!ingredients.length}
            >
              {t("calories.addButton")}
            </button>
            <button
              type="button"
              className="rounded-xl border px-3 py-2 text-sm font-medium"
              onClick={resetForm}
            >
              {t("dishes.actions.cancel")}
            </button>
          </div>
          {error && (
            <div className="md:col-span-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </form>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{t("calories.title")}</h2>
        {sortedEntries.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{t("calories.empty")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b text-gray-500">
                  <th className="py-2 pr-4">{t("calories.tableHeaders.ingredient")}</th>
                  <th className="py-2 pr-4">{t("calories.tableHeaders.amount")}</th>
                  <th className="py-2 pr-4">{t("calories.tableHeaders.unit")}</th>
                  <th className="py-2 pr-4">{t("calories.tableHeaders.calories")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((entry) => {
                  const draft = drafts[entry.id] ?? {
                    ingredientKey: entry.ingredientKey,
                    amount: String(entry.amount),
                    unit: entry.unit ?? unitOptions[0] ?? "",
                    calories: String(entry.calories),
                  };

                  const ingredientOptionsForEntry = ingredientMap.has(draft.ingredientKey)
                    ? ingredients
                    : [
                        ...ingredients,
                        {
                          key: draft.ingredientKey,
                          name: entry.ingredientName,
                          unit: draft.unit,
                          translations: {},
                        },
                      ];

                  return (
                    <tr key={entry.id} className="border-b last:border-none">
                      <td className="py-2 pr-4">
                        <select
                          className="w-full rounded-lg border px-2 py-1"
                          value={draft.ingredientKey}
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [entry.id]: {
                                ...draft,
                                ingredientKey: event.target.value,
                              },
                            }))
                          }
                          onBlur={() => commitDraft(entry)}
                        >
                        {ingredientOptionsForEntry.map((ingredient) => (
                          <option key={ingredient.key} value={ingredient.key}>
                            {optionLabel(ingredient) ?? ingredient.name}
                          </option>
                        ))}
                        </select>
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          className="w-full rounded-lg border px-2 py-1"
                          value={draft.amount}
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [entry.id]: {
                                ...draft,
                                amount: event.target.value,
                              },
                            }))
                          }
                          onBlur={() => commitDraft(entry)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              commitDraft(entry);
                            } else if (event.key === "Escape") {
                              event.preventDefault();
                              resetDraft(entry);
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
                              [entry.id]: {
                                ...draft,
                                unit: event.target.value,
                              },
                            }))
                          }
                          onBlur={() => commitDraft(entry)}
                        >
                          {unitOptions.map((value) => (
                            <option key={value} value={value}>
                              {formatUnit(value)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          className="w-full rounded-lg border px-2 py-1"
                          value={draft.calories}
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [entry.id]: {
                                ...draft,
                                calories: event.target.value,
                              },
                            }))
                          }
                          onBlur={() => commitDraft(entry)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              commitDraft(entry);
                            } else if (event.key === "Escape") {
                              event.preventDefault();
                              resetDraft(entry);
                            }
                          }}
                        />
                      </td>
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
