import { useMemo, useState } from "react";

import { MEAL_LABEL_KEYS, MEAL_ORDER } from "../../constants/meals";
import { useTranslation } from "../../i18n";
import type { DayPlan, Dish, Ingredient, IngredientOption, MealSlot } from "../../types";
import { uid } from "../../utils/id";

interface DishesPageProps {
  dishes: Dish[];
  plans: DayPlan[];
  onUpsertDish: (dish: Dish) => Promise<void>;
  onDeleteDish: (id: string) => Promise<void>;
  ingredientOptions: IngredientOption[];
}

export function DishesPage({ dishes, plans, onUpsertDish, onDeleteDish, ingredientOptions }: DishesPageProps) {
  const [editing, setEditing] = useState<Dish | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mealFilter, setMealFilter] = useState<MealSlot | "all">("all");
  const { t } = useTranslation();

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
            className="px-2 py-1.5 rounded-lg border"
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
        />
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((dish) => (
          <div key={dish.id} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {dish.name || t("dishes.untitled")}
                </h3>
                <p className="text-xs text-gray-500">{t(MEAL_LABEL_KEYS[dish.meal])}</p>
              </div>
              <div className="flex gap-2">
                <button
                  className="text-sm px-2 py-1 rounded-lg border"
                  onClick={() => setEditing(dish)}
                >
                  {t("dishes.edit")}
                </button>
                <button
                  className="text-sm px-2 py-1 rounded-lg border"
                  onClick={() => removeDish(dish.id)}
                  disabled={busyId === dish.id}
                >
                  {t("dishes.delete")}
                </button>
              </div>
            </div>
            <ul className="mt-3 text-sm list-disc list-inside text-gray-700">
              {dish.ingredients.map((ingredient) => (
                <li key={ingredient.id}>
                  {ingredient.name} — {ingredient.qty} {ingredient.unit}
                </li>
              ))}
            </ul>
            {dish.notes && <p className="mt-2 text-sm text-gray-500">{dish.notes}</p>}
            {usedDishIds.has(dish.id) && (
              <div className="mt-3 inline-block text-xs px-2 py-1 rounded bg-gray-100">
                {t("dishes.inCalendar")}
              </div>
            )}
          </div>
        ))}
        {!filtered.length && <div className="text-gray-500">{t("dishes.empty")}</div>}
      </div>
    </div>
  );
}

interface DishEditorProps {
  dish: Dish;
  saving: boolean;
  onSave: (dish: Dish) => Promise<void>;
  onCancel: () => void;
  ingredientOptions: IngredientOption[];
}

function DishEditor({ dish, onSave, onCancel, saving, ingredientOptions }: DishEditorProps) {
  const [state, setState] = useState<Dish>({ ...dish });
  const [existingChoice, setExistingChoice] = useState<string>("");
  const { t, language } = useTranslation();

  const availableExisting = useMemo(() => {
    const usedKeys = new Set(
      state.ingredients.map((ingredient) =>
        `${ingredient.name.toLowerCase()}__${ingredient.unit.toLowerCase()}`,
      ),
    );
    return ingredientOptions.filter((option) => !usedKeys.has(option.key));
  }, [ingredientOptions, state.ingredients]);

  function addIngredient() {
    setState((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { id: uid("ing"), name: "", unit: "g", qty: 100 }],
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
        { id: uid("ing"), name: option.name, unit: option.unit, qty: 1 },
      ],
    }));
    setExistingChoice("");
  }

  function findMatchingOption(value: string): IngredientOption | undefined {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    return ingredientOptions.find((option) => {
      if (option.name.toLowerCase() === normalized) return true;
      const translation = option.translations[language];
      return translation ? translation.toLowerCase() === normalized : false;
    });
  }

  function handleNameChange(id: string, value: string) {
    setState((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient) => {
        if (ingredient.id !== id) return ingredient;
        const match = findMatchingOption(value);
        if (match) {
          return { ...ingredient, name: match.name, unit: match.unit };
        }
        return { ...ingredient, name: value };
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

  function updateIngredient(id: string, patch: Partial<Ingredient>) {
    setState((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient) =>
        ingredient.id === id ? { ...ingredient, ...patch } : ingredient,
      ),
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
      const key = `${ingredient.name.trim().toLowerCase()}__${ingredient.unit.trim().toLowerCase()}`;
      if (ingredient.name.trim() && ingredient.unit.trim() && !seen.has(key)) {
        seen.add(key);
        result.push({ ...ingredient, name: ingredient.name.trim(), unit: ingredient.unit.trim() });
      }
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
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <h4 className="font-semibold">{t("dishes.editor.ingredientsTitle")}</h4>
            <div className="flex flex-wrap items-center gap-2">
              <button className="text-sm px-2 py-1 rounded-lg border" onClick={addIngredient}>
                {t("dishes.editor.addNew")}
              </button>
            <div className="flex items-center gap-2">
              <select
                className="text-sm px-2 py-1.5 rounded-lg border"
                value={existingChoice}
                onChange={(event) => setExistingChoice(event.target.value)}
                disabled={!availableExisting.length}
              >
                <option value="">{t("dishes.editor.selectExisting")}</option>
                {availableExisting.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.name} · {option.unit}
                    {option.translations[language]
                      ? ` — ${option.translations[language]}`
                      : ""}
                  </option>
                ))}
              </select>
              <button
                className="text-sm px-2 py-1 rounded-lg border"
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
            <div key={ingredient.id} className="grid grid-cols-12 gap-2 items-center">
              <input
                className="col-span-5 px-3 py-2 rounded-xl border"
                placeholder={t("dishes.editor.ingredientNamePlaceholder")}
                value={ingredient.name}
                onChange={(event) => handleNameChange(ingredient.id, event.target.value)}
                list={`ingredient-suggestions-${ingredient.id}`}
              />
              <datalist id={`ingredient-suggestions-${ingredient.id}`}>
                {suggestionList(ingredient.name).map((option) => (
                  <option key={option.key} value={option.name}>
                    {option.name} · {option.unit}
                    {option.translations[language]
                      ? ` — ${option.translations[language]}`
                      : ""}
                  </option>
                ))}
              </datalist>
              <input
                type="number"
                className="col-span-3 px-3 py-2 rounded-xl border"
                placeholder={t("dishes.editor.ingredientQtyPlaceholder")}
                value={Number.isFinite(ingredient.qty) ? ingredient.qty : ""}
                onChange={(event) =>
                  updateIngredient(ingredient.id, {
                    qty: parseFloat(event.target.value || "0"),
                  })
                }
              />
              <input
                className="col-span-2 px-3 py-2 rounded-xl border"
                placeholder={t("dishes.editor.ingredientUnitPlaceholder")}
                value={ingredient.unit}
                onChange={(event) =>
                  updateIngredient(ingredient.id, { unit: event.target.value })
                }
              />
              <button
                className="col-span-2 px-3 py-2 rounded-xl border"
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
