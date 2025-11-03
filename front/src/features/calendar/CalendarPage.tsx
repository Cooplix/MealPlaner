import { useMemo, useState } from "react";

import { MEAL_LABEL_KEYS, MEAL_ORDER } from "../../constants/meals";
import { useTranslation } from "../../i18n";
import type { DayPlan, Dish, MealSlot } from "../../types";
import { addDays, startOfWeek, toDateISO } from "../../utils/dates";

interface CalendarPageProps {
  dishes: Dish[];
  plans: DayPlan[];
  onUpsertPlan: (plan: DayPlan) => Promise<void>;
  onDeletePlan: (dateISO: string) => Promise<void>;
}

export function CalendarPage({
  dishes,
  plans,
  onUpsertPlan,
  onDeletePlan,
}: CalendarPageProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [busyDate, setBusyDate] = useState<string | null>(null);
  const { t, language } = useTranslation();

  const locale = language === "uk" ? "uk-UA" : language === "pl" ? "pl-PL" : "en-US";

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

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

  const recommendations = useMemo(() => {
    const scored = dishes
      .filter((dish) => !weekDishIds.has(dish.id))
      .map((dish) => {
        const overlap = dish.ingredients.reduce(
          (total, ingredient) => total + (ingredientPool.has(ingredient.name.toLowerCase()) ? 1 : 0),
          0,
        );
        return { dish, overlap };
      })
      .sort((a, b) => b.overlap - a.overlap);
    return scored.slice(0, 12);
  }, [dishes, ingredientPool, weekDishIds]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button className="px-3 py-2 rounded-xl border" onClick={() => setWeekStart(addDays(weekStart, -7))}>
          {t("calendar.previous")}
        </button>
        <div className="px-3 py-2 rounded-xl border bg-white">
          {t("calendar.weekRange", { start: toDateISO(weekDays[0]), end: toDateISO(weekDays[6]) })}
        </div>
        <button className="px-3 py-2 rounded-xl border" onClick={() => setWeekStart(addDays(weekStart, 7))}>
          {t("calendar.next")}
        </button>
        <button
          className="ml-auto px-3 py-2 rounded-xl border"
          onClick={() => setWeekStart(startOfWeek(new Date()))}
        >
          {t("calendar.today")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-4">
          {weekDays.map((date) => {
            const iso = toDateISO(date);
            return (
              <div key={iso} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    {date.toLocaleDateString(locale, {
                      weekday: "long",
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </h3>
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
                      value={planFor(iso).slots[slot]}
                      onChange={(dishId) => setSlot(iso, slot, dishId)}
                      busy={busyDate === iso}
                      allDishes={dishes}
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
              {recommendations.map(({ dish, overlap }) => (
                <div key={dish.id} className="p-2 rounded-xl border">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm text-gray-900">{dish.name}</div>
                      <div className="text-xs text-gray-500">
                        {t(MEAL_LABEL_KEYS[dish.meal])} · {t("calendar.matches", { count: overlap })}
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
                        {ingredient.name} ({ingredient.qty}
                        {ingredient.unit})
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
}

function MealPicker({ slot, dishes, value, onChange, busy, allDishes }: MealPickerProps) {
  const selected = allDishes.find((dish) => dish.id === value) ?? undefined;
  const { t } = useTranslation();
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
          <div className="font-medium">{t("calendar.ingredientsLabel")}</div>
          <ul className="list-disc list-inside">
            {selected.ingredients.map((ingredient) => (
              <li key={ingredient.id}>
                {ingredient.name} — {ingredient.qty}
                {ingredient.unit}
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
