import { useCallback, useEffect, useMemo, useState } from "react";

import { InlineAlert } from "../../components/InlineAlert";
import { StatusBadge } from "../../components/StatusBadge";
import { MEAL_LABEL_KEYS, MEAL_ORDER } from "../../constants/meals";
import { useTranslation } from "../../i18n";
import type { DayPlan, Dish, IngredientOption, MealSlot } from "../../types";
import { addDays, startOfWeek, toDateISO } from "../../utils/dates";
import { getLocalizedIngredientName } from "../../utils/ingredientNames";
import { inventoryApi } from "../inventory/api";
import type { InventoryItem } from "../inventory/types";

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function nameUnitKey(name: string, unit: string): string {
  return `${normalizeKey(name)}__${normalizeKey(unit)}`;
}

type RecommendationScoreLevel = "high" | "medium" | "low";

function scoreTone(level: RecommendationScoreLevel): "success" | "info" | "neutral" {
  switch (level) {
    case "high":
      return "success";
    case "medium":
      return "info";
    default:
      return "neutral";
  }
}

interface CalendarPageProps {
  dishes: Dish[];
  plans: DayPlan[];
  ingredientOptions: IngredientOption[];
  onUpsertPlan: (plan: DayPlan) => Promise<void>;
  onDeletePlan: (dateISO: string) => Promise<void>;
}

export function CalendarPage({
  dishes,
  plans,
  ingredientOptions,
  onUpsertPlan,
  onDeletePlan,
}: CalendarPageProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [busyDate, setBusyDate] = useState<string | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const { t, language } = useTranslation();
  const formatUnit = (value: string): string => {
    const label = t(`units.${value}`);
    return label.startsWith("units.") ? value : label;
  };

  const locale = language === "uk" ? "uk-UA" : language === "pl" ? "pl-PL" : "en-US";
  const weekStartISO = useMemo(() => toDateISO(weekStart), [weekStart]);
  const dishById = useMemo(() => new Map(dishes.map((dish) => [dish.id, dish])), [dishes]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  useEffect(() => {
    let ignore = false;
    setInventoryLoading(true);
    setInventoryError(null);
    inventoryApi
      .listItems()
      .then((data) => {
        if (!ignore) setInventoryItems(data);
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const message = err instanceof Error ? err.message : String(err ?? "unknown error");
          setInventoryError(message);
          setInventoryItems([]);
        }
      })
      .finally(() => {
        if (!ignore) setInventoryLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  function planFor(dateISO: string): DayPlan {
    const found = plans.find((plan) => plan.dateISO === dateISO);
    return found ?? { dateISO, slots: {} };
  }

  async function setSlot(dateISO: string, slot: MealSlot, dishId: string | undefined) {
    setBusyDate(dateISO);
    try {
      const current = planFor(dateISO);
      const nextSlots: Partial<Record<MealSlot, string>> = { ...current.slots };
      if (dishId) {
        const dish = dishes.find((item) => item.id === dishId);
        if (!dish || dish.meal !== slot) {
          return;
        }
        nextSlots[slot] = dishId;
      } else {
        delete nextSlots[slot];
      }
      const sanitized = Object.fromEntries(
        Object.entries(nextSlots).filter(([, value]) => value),
      ) as Partial<Record<MealSlot, string>>;
      if (Object.keys(sanitized).length === 0) {
        await onDeletePlan(dateISO);
      } else {
        await onUpsertPlan({ dateISO, slots: sanitized });
      }
    } finally {
      setBusyDate(null);
    }
  }

  const weekDishIds = useMemo(() => {
    const ids = new Set<string>();
    weekDays.forEach((date) => {
      const plan = plans.find((item) => item.dateISO === toDateISO(date));
      if (!plan) return;
      Object.values(plan.slots).forEach((dishId) => {
        if (dishId) ids.add(dishId);
      });
    });
    return ids;
  }, [weekDays, plans]);

  const ingredientPool = useMemo(() => {
    const names = new Set<string>();
    weekDays.forEach((date) => {
      const plan = plans.find((item) => item.dateISO === toDateISO(date));
      if (!plan) return;
      Object.values(plan.slots).forEach((dishId) => {
        const dish = dishes.find((candidate) => candidate.id === dishId);
        dish?.ingredients.forEach((ingredient) => names.add(ingredient.name.toLowerCase()));
      });
    });
    return names;
  }, [weekDays, plans, dishes]);

  const lastUsedBeforeWeekStart = useMemo(() => {
    const map = new Map<string, string>();
    plans.forEach((plan) => {
      if (!plan?.dateISO || plan.dateISO >= weekStartISO) return;
      Object.values(plan.slots).forEach((dishId) => {
        if (!dishId) return;
        const existing = map.get(dishId);
        if (!existing || plan.dateISO > existing) {
          map.set(dishId, plan.dateISO);
        }
      });
    });
    return map;
  }, [plans, weekStartISO]);

  const inStockLookup = useMemo(() => {
    const byKey = new Set<string>();
    const byNameUnit = new Set<string>();
    inventoryItems.forEach((item) => {
      if (!(item.quantity > 0)) return;
      if (item.ingredientKey && item.ingredientKey.trim()) {
        byKey.add(normalizeKey(item.ingredientKey));
      }
      if (item.name && item.unit) {
        byNameUnit.add(nameUnitKey(item.name, item.unit));
      }
    });
    return { byKey, byNameUnit };
  }, [inventoryItems]);

  const recommendations = useMemo(() => {
    const scored = dishes
      .filter((dish) => !weekDishIds.has(dish.id))
      .map((dish) => {
        const overlap = dish.ingredients.reduce(
          (total, ingredient) => total + (ingredientPool.has(ingredient.name.toLowerCase()) ? 1 : 0),
          0,
        );
        const stockCount = dish.ingredients.reduce((total, ingredient) => {
          if (ingredient.ingredientKey && inStockLookup.byKey.has(normalizeKey(ingredient.ingredientKey))) {
            return total + 1;
          }
          if (inStockLookup.byNameUnit.has(nameUnitKey(ingredient.name, ingredient.unit))) {
            return total + 1;
          }
          return total;
        }, 0);

        const ingredientCount = dish.ingredients.length || 1;
        const overlapScore = overlap / ingredientCount;
        const stockScore = stockCount / ingredientCount;
        const lastUsedISO = lastUsedBeforeWeekStart.get(dish.id) ?? null;
        const daysSinceLastUsed = lastUsedISO
          ? Math.floor((weekStart.getTime() - new Date(`${lastUsedISO}T00:00:00`).getTime()) / 86400000)
          : null;
        const varietyScore =
          lastUsedISO === null
            ? 1
            : daysSinceLastUsed !== null && daysSinceLastUsed >= 30
              ? 1
              : daysSinceLastUsed !== null && daysSinceLastUsed >= 14
                ? 0.7
                : 0;

        const score = overlapScore * 0.45 + stockScore * 0.35 + varietyScore * 0.2;
        const scoreLevel: RecommendationScoreLevel =
          score >= 0.67 ? "high" : score >= 0.4 ? "medium" : "low";

        const reasons = {
          economy: overlap >= 2 || overlapScore >= 0.35,
          stock: stockCount >= 2 || stockScore >= 0.35,
          variety: varietyScore >= 0.7,
        };

        return { dish, overlap, stockCount, score, scoreLevel, reasons, lastUsedISO };
      })
      .sort((a, b) => b.score - a.score || b.overlap - a.overlap);
    return scored.slice(0, 12);
  }, [
    dishes,
    ingredientPool,
    weekDishIds,
    inStockLookup,
    lastUsedBeforeWeekStart,
    weekStart,
  ]);

  const dishesByMeal = useMemo(() => {
    const map: Record<MealSlot, Dish[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    dishes.forEach((dish) => {
      map[dish.meal].push(dish);
    });
    return map;
  }, [dishes]);

  const resolveIngredientName = useCallback(
    (name: string, unit: string) =>
      getLocalizedIngredientName(ingredientOptions, language, name, unit),
    [ingredientOptions, language],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 rounded-xl border" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            {t("calendar.previous")}
          </button>
          <button className="px-3 py-2 rounded-xl border" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            {t("calendar.next")}
          </button>
        </div>
        <div className="w-full sm:w-auto px-3 py-2 rounded-xl border bg-white text-sm">
          {t("calendar.weekRange", { start: toDateISO(weekDays[0]), end: toDateISO(weekDays[6]) })}
        </div>
        <button
          className="w-full sm:w-auto sm:ml-auto px-3 py-2 rounded-xl border"
          onClick={() => setWeekStart(startOfWeek(new Date()))}
        >
          {t("calendar.today")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-4">
          {weekDays.map((date) => {
            const iso = toDateISO(date);
            const plan = planFor(iso);
            const filledSlots = MEAL_ORDER.reduce((count, slot) => count + (plan.slots[slot] ? 1 : 0), 0);
            const totalSlots = MEAL_ORDER.length;
            const coverageTone = filledSlots === 0 ? "neutral" : filledSlots === totalSlots ? "success" : "warn";
            const totalCalories = MEAL_ORDER.reduce((sum, slot) => {
              const dishId = plan.slots[slot];
              if (!dishId) return sum;
              return sum + (dishById.get(dishId)?.calories ?? 0);
            }, 0);
            return (
              <div key={iso} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-gray-900">
                      {date.toLocaleDateString(locale, {
                        weekday: "long",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={coverageTone}>
                        {t("calendar.daySummary.coverage", { filled: filledSlots, total: totalSlots })}
                      </StatusBadge>
                      <StatusBadge tone="neutral">
                        {t("calendar.daySummary.caloriesTotal", { calories: Math.round(totalCalories) })}
                      </StatusBadge>
                    </div>
                  </div>
                  <button
                    className="text-sm px-2 py-1 rounded-lg border"
                    onClick={() => {
                      setBusyDate(iso);
                      void onDeletePlan(iso).finally(() => setBusyDate(null));
                    }}
                    disabled={busyDate === iso}
                  >
                    {t("calendar.clearDay")}
                  </button>
                </div>

                <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {MEAL_ORDER.map((slot) => (
                    <MealPicker
                      key={slot}
                      slot={slot}
                      dishes={dishesByMeal[slot]}
                      value={plan.slots[slot]}
                      onChange={(dishId) => setSlot(iso, slot, dishId)}
                      busy={busyDate === iso}
                      allDishes={dishes}
                      resolveIngredientName={resolveIngredientName}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-2xl border bg-white p-4 shadow-sm sticky top-20">
            <h3 className="font-semibold text-gray-900">{t("calendar.recommendationsTitle")}</h3>
            <p className="text-sm text-gray-500">{t("calendar.recommendationsHint")}</p>
            <div className="mt-3 space-y-2 max-h-[60vh] overflow-auto pr-1">
              {inventoryError && (
                <InlineAlert
                  tone="warn"
                  message={
                    t("calendar.recommendations.inventoryWarning", { message: inventoryError }) as string
                  }
                />
              )}

              {recommendations.map(({ dish, overlap, stockCount, scoreLevel, reasons, lastUsedISO }) => (
                <div
                  key={dish.id}
                  className={`p-2 rounded-xl border ${
                    scoreLevel === "high"
                      ? "border-[color:var(--ui-success-border)] bg-[color:var(--ui-success-bg)]"
                      : scoreLevel === "medium"
                        ? "border-[color:var(--ui-info-border)] bg-[color:var(--ui-info-bg)]"
                        : "border-[color:var(--ui-border)] bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm text-gray-900">{dish.name}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <StatusBadge tone={scoreTone(scoreLevel)}>
                          {t("calendar.recommendations.scoreBadge", {
                            level: t(`calendar.recommendations.score.${scoreLevel}`),
                          })}
                        </StatusBadge>
                        {reasons.economy && (
                          <StatusBadge tone="info">
                            {t("calendar.recommendations.reasons.economy")}
                          </StatusBadge>
                        )}
                        {reasons.stock && (
                          <StatusBadge tone="success">
                            {t("calendar.recommendations.reasons.stock")}
                          </StatusBadge>
                        )}
                        {reasons.variety && (
                          <StatusBadge tone="neutral">
                            {t("calendar.recommendations.reasons.variety")}
                          </StatusBadge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t(MEAL_LABEL_KEYS[dish.meal])} · {t("calendar.matches", { count: overlap })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {!inventoryLoading && (
                          <>
                            {t("calendar.recommendations.stockLine", {
                              count: stockCount,
                              total: dish.ingredients.length,
                            })}
                            {" · "}
                          </>
                        )}
                        {lastUsedISO
                          ? t("calendar.recommendations.lastUsed", { date: lastUsedISO })
                          : t("calendar.recommendations.neverUsed")}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t("calendar.caloriesLabel", { calories: Math.round(dish.calories ?? 0) })}
                      </div>
                    </div>
                    <button
                      className="text-xs px-2 py-1 rounded-lg border"
                      onClick={() => {
                        for (const day of weekDays) {
                          const iso = toDateISO(day);
                          const plan = planFor(iso);
                          for (const slot of MEAL_ORDER) {
                            if (slot !== dish.meal) continue;
                            if (!plan.slots[slot]) {
                              setBusyDate(iso);
                              void onUpsertPlan({
                                dateISO: iso,
                                slots: { ...plan.slots, [slot]: dish.id },
                              }).finally(() => setBusyDate(null));
                              return;
                            }
                          }
                        }
                      }}
                    >
                      {t("calendar.add")}
                    </button>
                  </div>
                  <ul className="mt-1 text-xs text-gray-600 list-disc list-inside">
                    {dish.ingredients.slice(0, 4).map((ingredient) => (
                      <li key={ingredient.id}>
                        {resolveIngredientName(ingredient.name, ingredient.unit)} ({ingredient.qty}
                        {formatUnit(ingredient.unit)})
                      </li>
                    ))}
                    {dish.ingredients.length > 4 && <li>…</li>}
                  </ul>
                </div>
              ))}

              {!recommendations.length && (
                <div className="text-sm text-gray-500">{t("calendar.recommendationsEmpty")}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MealPickerProps {
  slot: MealSlot;
  dishes: Dish[];
  allDishes: Dish[];
  value?: string;
  onChange: (value: string | undefined) => Promise<void>;
  busy: boolean;
  resolveIngredientName: (name: string, unit: string) => string;
}

function MealPicker({
  slot,
  dishes,
  value,
  onChange,
  busy,
  allDishes,
  resolveIngredientName,
}: MealPickerProps) {
  const selected = allDishes.find((dish) => dish.id === value) ?? undefined;
  const { t } = useTranslation();
  const formatUnit = (unit: string): string => {
    const label = t(`units.${unit}`);
    return label.startsWith("units.") ? unit : label;
  };
  const options = useMemo(() => {
    if (selected && !dishes.some((dish) => dish.id === selected.id)) {
      return [...dishes, selected];
    }
    return dishes;
  }, [dishes, selected]);

  return (
    <div className="border rounded-xl p-3">
      <div className="text-sm font-medium mb-2 text-gray-900">{t(MEAL_LABEL_KEYS[slot])}</div>
      <select
        className="w-full px-3 py-2 rounded-xl border"
        value={value ?? ""}
        onChange={(event) => void onChange(event.target.value || undefined)}
        disabled={busy}
      >
        <option value="">{t("calendar.selectDishPlaceholder")}</option>
        {options.map((dish) => (
          <option key={dish.id} value={dish.id}>
            {dish.name}
          </option>
        ))}
      </select>
      {selected && (
        <div className="mt-2 text-xs text-gray-600">
          <div>
            {t("calendar.caloriesLabel", { calories: Math.round(selected.calories ?? 0) })}
          </div>
          <div className="font-medium">{t("calendar.ingredientsLabel")}</div>
          <ul className="list-disc list-inside">
            {selected.ingredients.map((ingredient) => (
              <li key={ingredient.id}>
                {resolveIngredientName(ingredient.name, ingredient.unit)} — {ingredient.qty}
                {formatUnit(ingredient.unit)}
              </li>
            ))}
          </ul>
          <button
            className="mt-2 text-xs px-2 py-1 rounded-lg border"
            onClick={() => void onChange(undefined)}
            disabled={busy}
          >
            {t("calendar.remove")}
          </button>
        </div>
      )}
    </div>
  );
}
