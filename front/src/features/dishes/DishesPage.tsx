import { useCallback, useMemo, useState } from "react";

import AutocompleteInput from "../../components/AutocompleteInput";
import { MEAL_LABEL_KEYS, MEAL_ORDER } from "../../constants/meals";
import { MEASUREMENT_UNITS } from "../../constants/measurementUnits";
import { useTranslation } from "../../i18n";
import type { DayPlan, Dish, Ingredient, IngredientOption, MealSlot } from "../../types";
import { findIngredientOption } from "../../utils/ingredientNames";
import { uid } from "../../utils/id";

interface DishesPageProps {
  dishes: Dish[];
  plans: DayPlan[];
  onUpsertDish: (dish: Dish) => Promise<void>;
  onDeleteDish: (id: string) => Promise<void>;
  ingredientOptions: IngredientOption[];
  units: string[];
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function buildIngredientKey(name: string, unit: string): string {
  return `${normalizeKey(name)}__${normalizeKey(unit)}`;
}

const NOTES_PREVIEW_LIMIT = 180;
const INGREDIENT_PREVIEW_LIMIT = 6;

function resolveIngredientKey(ingredient: Ingredient): string | null {
  if (ingredient.ingredientKey && ingredient.ingredientKey.trim()) {
    return normalizeKey(ingredient.ingredientKey);
  }
  if (!ingredient.name || !ingredient.unit) return null;
  return buildIngredientKey(ingredient.name, ingredient.unit);
}

export function DishesPage({
  dishes,
  plans,
  onUpsertDish,
  onDeleteDish,
  ingredientOptions,
  units,
}: DishesPageProps) {
  const [editing, setEditing] = useState<Dish | null>(null);
  const [detailDish, setDetailDish] = useState<Dish | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mealFilter, setMealFilter] = useState<MealSlot | "all">("all");
  const { t, language } = useTranslation();
  const unitOptions = units.length ? units : Array.from(MEASUREMENT_UNITS);

  const optionMap = useMemo(() => {
    const map = new Map<string, IngredientOption>();
    ingredientOptions.forEach((option) => map.set(normalizeKey(option.key), option));
    return map;
  }, [ingredientOptions]);

  const getOptionForIngredient = useCallback(
    (ingredient: Ingredient) => {
      const key = resolveIngredientKey(ingredient);
      if (!key) return undefined;
      return optionMap.get(key);
    },
    [optionMap],
  );

  const ingredientDisplayName = useCallback(
    (ingredient: Ingredient): string => {
      const option = getOptionForIngredient(ingredient);
      if (option && ingredient.name === option.name) {
        const localized = option.translations[language];
        if (localized && localized.trim().length > 0) return localized;
      }
      return ingredient.name;
    },
    [getOptionForIngredient, language],
  );
  const formatUnit = (value: string): string => {
    const label = t(`units.${value}`);
    return label.startsWith("units.") ? value : label;
  };

  const usedDishIds = useMemo(
    () =>
      new Set<string>(plans.flatMap((p) => Object.values(p.slots)).filter(Boolean) as string[]),
    [plans],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dishes.filter((dish) => {
      if (mealFilter !== "all" && dish.meal !== mealFilter) {
        return false;
      }
      if (!q) return true;
      return (
        dish.name.toLowerCase().includes(q) ||
        dish.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(q))
      );
    });
  }, [query, dishes, mealFilter]);

  async function saveDish(dish: Dish) {
    setBusyId(dish.id);
    try {
      await onUpsertDish(dish);
      setEditing(null);
    } finally {
      setBusyId(null);
    }
  }

  async function removeDish(id: string) {
    if (!window.confirm(t("dishes.confirmDelete"))) return;
    setBusyId(id);
    try {
      await onDeleteDish(id);
    } finally {
      setBusyId(null);
    }
  }

  function openDishDetails(dish: Dish) {
    setDetailDish(dish);
  }

  function openDishEditorFromDetails() {
    if (!detailDish) return;
    setDetailDish(null);
    setEditing(detailDish);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          className="px-3 py-2 rounded-xl bg-gray-900 text-white"
          onClick={() =>
            setEditing({
              id: uid("dish"),
              name: "",
              meal: mealFilter === "all" ? "lunch" : mealFilter,
              ingredients: [],
              calories: 0,
            })
          }
        >
          {t("dishes.add")}
        </button>
        <input
          className="flex-1 px-3 py-2 rounded-xl border"
          placeholder={t("dishes.searchPlaceholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span>{t("dishes.filterLabel")}:</span>
          <select
            className="rounded-xl border px-3 py-2"
            value={mealFilter}
            onChange={(event) => setMealFilter(event.target.value as MealSlot | "all")}
          >
            <option value="all">{t("dishes.filterAll")}</option>
            {MEAL_ORDER.map((slot) => (
              <option key={slot} value={slot}>
                {t(MEAL_LABEL_KEYS[slot])}
              </option>
            ))}
          </select>
        </label>
      </div>

      {editing && (
        <DishEditor
          key={editing.id}
          dish={editing}
          onCancel={() => setEditing(null)}
          onSave={saveDish}
          saving={busyId === editing.id}
          ingredientOptions={ingredientOptions}
          unitOptions={unitOptions}
        />
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((dish) => {
          const notes = dish.notes?.trim() ?? "";
          const hasLongNotes = notes.length > NOTES_PREVIEW_LIMIT;
          const notesPreview = hasLongNotes ? `${notes.slice(0, NOTES_PREVIEW_LIMIT).trim()}…` : notes;
          const visibleIngredients = dish.ingredients.slice(0, INGREDIENT_PREVIEW_LIMIT);
          const remainingIngredients = Math.max(0, dish.ingredients.length - visibleIngredients.length);
          const showMore = hasLongNotes || remainingIngredients > 0;

          return (
            <div
              key={dish.id}
              className="rounded-2xl border bg-white p-4 shadow-sm flex flex-col h-[360px]"
            >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {dish.name || t("dishes.untitled")}
                </h3>
                <p className="text-xs text-gray-500">
                  {t(MEAL_LABEL_KEYS[dish.meal])}
                </p>
                <p className="text-xs text-gray-500">
                  {t("dishes.caloriesLabel", { calories: Math.round(dish.calories ?? 0) })}
                </p>
                {(dish.createdByName || dish.createdBy) && (
                  <p className="text-xs text-gray-400">
                    Added by {dish.createdByName ?? dish.createdBy}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-xl border px-3 py-2 text-sm"
                  onClick={() => setEditing(dish)}
                >
                  {t("dishes.edit")}
                </button>
                <button
                  className="rounded-xl border px-3 py-2 text-sm"
                  onClick={() => removeDish(dish.id)}
                  disabled={busyId === dish.id}
                >
                  {t("dishes.delete")}
                </button>
              </div>
            </div>
            <div className="mt-3 flex-1 space-y-2 overflow-hidden">
              <ul className="text-sm list-disc list-inside text-gray-700 space-y-1">
                {visibleIngredients.map((ingredient) => (
                <li key={ingredient.id}>
                  {ingredientDisplayName(ingredient)} — {ingredient.qty} {formatUnit(ingredient.unit)}
                </li>
              ))}
              </ul>
              {remainingIngredients > 0 && (
                <div className="text-xs text-gray-400">
                  {t("dishes.moreIngredients", { count: remainingIngredients })}
                </div>
              )}
              {notes && (
                <p className="text-sm text-gray-500 whitespace-pre-wrap">{notesPreview}</p>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between">
              {usedDishIds.has(dish.id) && (
                <div className="inline-block text-xs px-3 py-1 rounded bg-gray-100">
                  {t("dishes.inCalendar")}
                </div>
              )}
              {showMore && (
                <button
                  className="text-xs font-semibold text-gray-700 hover:text-gray-900"
                  onClick={() => openDishDetails(dish)}
                >
                  {t("dishes.showMore")}
                </button>
              )}
            </div>
          </div>
          );
        })}
        {!filtered.length && <div className="text-gray-500">{t("dishes.empty")}</div>}
      </div>

      {detailDish && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDetailDish(null);
            }
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {detailDish.name || t("dishes.untitled")}
                </h2>
                <p className="text-sm text-gray-500">{t("dishes.detailsTitle")}</p>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setDetailDish(null)}
                aria-label={t("dishes.detailsClose") as string}
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t("dishes.editor.ingredientsTitle")}
                </div>
                <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-gray-700">
                  {detailDish.ingredients.map((ingredient) => (
                    <li key={ingredient.id}>
                      {ingredientDisplayName(ingredient)} — {ingredient.qty} {formatUnit(ingredient.unit)}
                    </li>
                  ))}
                </ul>
              </div>
              {detailDish.notes && detailDish.notes.trim() && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t("dishes.detailsNotes")}
                  </div>
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                    {detailDish.notes}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border px-3 py-2 text-sm"
                onClick={() => setDetailDish(null)}
              >
                {t("dishes.detailsClose")}
              </button>
              <button
                type="button"
                className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white"
                onClick={openDishEditorFromDetails}
              >
                {t("dishes.detailsOpen")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface DishEditorProps {
  dish: Dish;
  saving: boolean;
  onSave: (dish: Dish) => Promise<void>;
  onCancel: () => void;
  ingredientOptions: IngredientOption[];
  unitOptions: string[];
}

function DishEditor({ dish, onSave, onCancel, saving, ingredientOptions, unitOptions }: DishEditorProps) {
  const [state, setState] = useState<Dish>(() => ({
    ...dish,
    calories: dish.calories ?? 0,
    ingredients: dish.ingredients.map((ingredient) => ({
      ...ingredient,
    })),
  }));
  const [existingChoice, setExistingChoice] = useState<string>("");
  const { t, language } = useTranslation();
  const optionMap = useMemo(() => {
    const map = new Map<string, IngredientOption>();
    ingredientOptions.forEach((option) => {
      map.set(normalizeKey(option.key), option);
    });
    return map;
  }, [ingredientOptions]);

  function displayNameForIngredient(ingredient: Ingredient): string {
    const key = resolveIngredientKey(ingredient);
    const option = key ? optionMap.get(key) : undefined;
    if (option && ingredient.name === option.name) {
      const localized = option.translations[language];
      if (localized && localized.trim().length > 0) return localized;
    }
    return ingredient.name;
  }
  const formatUnit = (value: string): string => {
    const label = t(`units.${value}`);
    return label.startsWith("units.") ? value : label;
  };

  const availableExisting = useMemo(() => {
    const usedKeys = new Set(
      state.ingredients
        .map((ingredient) => resolveIngredientKey(ingredient))
        .filter((key): key is string => Boolean(key)),
    );
    return ingredientOptions.filter((option) => !usedKeys.has(option.key));
  }, [ingredientOptions, state.ingredients]);

  function addIngredient() {
    setState((prev) => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        { id: uid("ing"), name: "", unit: unitOptions[0] ?? "", qty: 100, ingredientKey: undefined },
      ],
    }));
  }

  function addExistingIngredient() {
    if (!existingChoice) return;
    const option = ingredientOptions.find((item) => item.key === existingChoice);
    if (!option) return;
    setState((prev) => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        {
          id: uid("ing"),
          name: option.name,
          unit: option.unit,
          qty: 1,
          ingredientKey: option.key,
        },
      ],
    }));
    setExistingChoice("");
  }

  function findMatchingOption(value: string): IngredientOption | undefined {
    const normalized = value.trim();
    if (!normalized) return undefined;
    return findIngredientOption(ingredientOptions, normalized);
  }

  function handleNameChange(id: string, value: string) {
    setState((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient) => {
        if (ingredient.id !== id) return ingredient;
        const match = findMatchingOption(value);
        if (match) {
          return {
            ...ingredient,
            name: match.name,
            unit: match.unit,
            ingredientKey: match.key,
          };
        }
        return { ...ingredient, name: value, ingredientKey: undefined };
      }),
    }));
  }

  function suggestionList(value: string): IngredientOption[] {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return ingredientOptions.slice(0, 8);
    }
    return ingredientOptions
      .filter((option) => {
        const base = option.name.toLowerCase();
        if (base.includes(normalized)) return true;
        const translation = option.translations[language]?.toLowerCase();
        return translation ? translation.includes(normalized) : false;
      })
      .slice(0, 8);
  }

  function buildIngredientSuggestions(value: string) {
    return suggestionList(value).map((option) => {
      const localized = option.translations[language];
      const label = localized && localized.trim().length > 0 ? localized : option.name;
      return {
        key: option.key,
        value: label,
        label,
        meta: formatUnit(option.unit),
      };
    });
  }

  function updateIngredient(id: string, patch: Partial<Ingredient>) {
    setState((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient) => {
        if (ingredient.id !== id) return ingredient;
        const next = { ...ingredient, ...patch };
        if (patch.unit) {
          const candidateKey = buildIngredientKey(next.name, next.unit);
          if (optionMap.has(candidateKey)) {
            next.ingredientKey = candidateKey;
          } else if (next.ingredientKey) {
            const currentOption = optionMap.get(normalizeKey(next.ingredientKey));
            if (currentOption && normalizeKey(currentOption.unit) !== normalizeKey(next.unit)) {
              next.ingredientKey = undefined;
            }
          }
        }
        return next;
      }),
    }));
  }

  function removeIngredient(id: string) {
    setState((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((ingredient) => ingredient.id !== id),
    }));
  }

  function normalizeIngredients(ingredients: Ingredient[]): Ingredient[] {
    const seen = new Set<string>();
    const result: Ingredient[] = [];
    ingredients.forEach((ingredient) => {
      const name = ingredient.name.trim();
      const normalizedUnit = (ingredient.unit || "").trim();
      const unit = unitOptions.includes(normalizedUnit) ? normalizedUnit : unitOptions[0] ?? "";
      if (!name || !unit) {
        return;
      }
      const keyFromName = buildIngredientKey(name, unit);
      const fromIngredient = ingredient.ingredientKey?.trim()
        ? normalizeKey(ingredient.ingredientKey)
        : undefined;
      const dedupeKey = fromIngredient ?? keyFromName;
      if (seen.has(dedupeKey)) {
        return;
      }
      seen.add(dedupeKey);
      const qty = Number.isFinite(ingredient.qty) ? ingredient.qty : 0;
      result.push({
        ...ingredient,
        name,
        unit,
        qty,
        ingredientKey: fromIngredient ?? keyFromName,
      });
    });
    return result;
  }

  async function handleSave() {
    const normalized = normalizeIngredients(state.ingredients);
    await onSave({ ...state, ingredients: normalized });
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600">{t("dishes.editor.nameLabel")}</label>
          <input
            className="w-full px-3 py-2 rounded-xl border"
            value={state.name}
            onChange={(event) => setState({ ...state, name: event.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600">{t("dishes.editor.mealLabel")}</label>
          <select
            className="w-full px-3 py-2 rounded-xl border"
            value={state.meal}
            onChange={(event) =>
              setState({ ...state, meal: event.target.value as MealSlot })
            }
          >
            {MEAL_ORDER.map((slot) => (
              <option key={slot} value={slot}>
                {t(MEAL_LABEL_KEYS[slot])}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm text-gray-600">{t("dishes.editor.notesLabel")}</label>
          <textarea
            className="w-full px-3 py-2 rounded-xl border"
            rows={2}
            value={state.notes || ""}
            onChange={(event) => setState({ ...state, notes: event.target.value })}
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-gray-900">{t("dishes.editor.ingredientsTitle")}</h4>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="text-sm px-3 py-1 rounded-lg border" onClick={addIngredient}>
              {t("dishes.editor.addNew")}
            </button>
            <div className="flex items-center gap-2">
              <select
                className="rounded-xl border px-3 py-2 text-sm"
                value={existingChoice}
                onChange={(event) => setExistingChoice(event.target.value)}
                disabled={!availableExisting.length}
              >
                <option value="">{t("dishes.editor.selectExisting")}</option>
                {availableExisting.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.translations[language] ?? option.name} · {formatUnit(option.unit)}
                  </option>
                ))}
              </select>
              <button
                className="text-sm px-3 py-1 rounded-lg border"
                onClick={addExistingIngredient}
                disabled={!existingChoice}
              >
                {t("dishes.editor.addExisting")}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-2 space-y-2">
          {state.ingredients.map((ingredient) => (
            <div
              key={ingredient.id}
              className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-center"
            >
              <AutocompleteInput
                containerClassName="sm:col-span-4"
                inputClassName="w-full rounded-xl border px-3 py-2"
                placeholder={t("dishes.editor.ingredientNamePlaceholder")}
                value={displayNameForIngredient(ingredient)}
                onChange={(value) => handleNameChange(ingredient.id, value)}
                options={buildIngredientSuggestions(ingredient.name)}
                ariaLabel={t("dishes.editor.ingredientNamePlaceholder") as string}
              />
              <input
                type="number"
                className="rounded-xl border px-3 py-2 sm:col-span-2"
                placeholder={t("dishes.editor.ingredientQtyPlaceholder")}
                value={Number.isFinite(ingredient.qty) ? ingredient.qty : ""}
                onChange={(event) =>
                  updateIngredient(ingredient.id, {
                    qty: Number.parseFloat(event.target.value || "0"),
                  })
                }
              />
              <select
                className="rounded-xl border px-3 py-2 sm:col-span-3"
                value={ingredient.unit}
                onChange={(event) =>
                  updateIngredient(ingredient.id, { unit: event.target.value })
                }
              >
                {unitOptions.map((value) => (
                  <option key={value} value={value}>
                    {formatUnit(value)}
                  </option>
                ))}
              </select>
              <button
                className="w-full rounded-xl border px-3 py-2 sm:w-auto sm:col-span-3 lg:col-span-2 whitespace-nowrap"
                onClick={() => removeIngredient(ingredient.id)}
              >
                {t("dishes.delete")}
              </button>
            </div>
          ))}
          {!state.ingredients.length && (
            <div className="text-sm text-gray-500">{t("dishes.editor.ingredientEmpty")}</div>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          className="px-3 py-2 rounded-xl bg-gray-900 text-white disabled:opacity-60"
          onClick={() => void handleSave()}
          disabled={!state.name || !state.ingredients.length || saving}
        >
          {t("dishes.actions.save")}
        </button>
        <button className="px-3 py-2 rounded-xl border" onClick={onCancel}>
          {t("dishes.actions.cancel")}
        </button>
      </div>
    </div>
  );
}
