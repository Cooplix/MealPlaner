import { useCallback, useEffect, useMemo, useState } from "react";

import { EmptyState } from "../../components/EmptyState";
import { InlineAlert } from "../../components/InlineAlert";
import { SectionHeader } from "../../components/SectionHeader";
import { api } from "../../api";
import { useTranslation } from "../../i18n";
import type { Language } from "../../i18n";
import { MEAL_LABEL_KEYS, MEAL_ORDER } from "../../constants/meals";
import type {
  DayPlan,
  Dish,
  DishCostAnalyticsResponse,
  DishCostSummary,
  IngredientOption,
  PurchaseEntry,
} from "../../types";
import { getIngredientOptionLabel } from "../../utils/ingredientNames";

interface DishCostsPageProps {
  dishes: Dish[];
  purchases: PurchaseEntry[];
  ingredients: IngredientOption[];
  plans: DayPlan[];
}

interface FiltersState {
  meal: string;
  onlyScheduled: boolean;
  minCost: string;
  maxCost: string;
}

export function DishCostsPage({ dishes, purchases, ingredients, plans }: DishCostsPageProps) {
  const { t, language } = useTranslation();
  const [filters, setFilters] = useState<FiltersState>({
    meal: "all",
    onlyScheduled: false,
    minCost: "",
    maxCost: "",
  });
  const [sortMode, setSortMode] = useState("costDesc");
  const [analytics, setAnalytics] = useState<DishCostAnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const collator = useMemo(
    () => new Intl.Collator(language, { sensitivity: "base" }),
    [language],
  );

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const data = await api.getDishCostAnalytics();
      setAnalytics(data);
      setAnalyticsError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? t("common.unknownError"));
      setAnalyticsError(message);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics, dishes.length, ingredients.length, purchases.length]);

  const scheduledDishIds = useMemo(() => {
    const ids = new Set<string>();
    plans.forEach((plan) => {
      Object.values(plan.slots).forEach((id) => {
        if (id) ids.add(id);
      });
    });
    return ids;
  }, [plans]);

  const costStats = analytics ?? {
    dishes: [],
    totalDishCost: 0,
    missingCount: 0,
    totalSpent: 0,
  };

  const dishMap = useMemo(() => new Map(dishes.map((dish) => [dish.id, dish])), [dishes]);

  const filteredDishes = useMemo(() => {
    const min = filters.minCost ? Number.parseFloat(filters.minCost) : undefined;
    const max = filters.maxCost ? Number.parseFloat(filters.maxCost) : undefined;
    return costStats.dishes.filter((dishCost) => {
      const dish = dishMap.get(dishCost.dishId);
      if (!dish) return false;
      if (filters.meal !== "all" && dish.meal !== filters.meal) return false;
      if (filters.onlyScheduled && !scheduledDishIds.has(dish.id)) return false;
      if (min !== undefined && dishCost.totalCost < min) return false;
      if (max !== undefined && dishCost.totalCost > max) return false;
      return true;
    });
  }, [costStats.dishes, dishMap, filters, scheduledDishIds]);

  const sortOptions = useMemo(
    () => [
      { value: "nameAsc", label: t("dishCosts.sort.options.nameAsc") as string },
      { value: "nameDesc", label: t("dishCosts.sort.options.nameDesc") as string },
      { value: "costDesc", label: t("dishCosts.sort.options.costDesc") as string },
      { value: "costAsc", label: t("dishCosts.sort.options.costAsc") as string },
      { value: "caloriesDesc", label: t("dishCosts.sort.options.caloriesDesc") as string },
      { value: "caloriesAsc", label: t("dishCosts.sort.options.caloriesAsc") as string },
      { value: "missingDesc", label: t("dishCosts.sort.options.missingDesc") as string },
      { value: "missingAsc", label: t("dishCosts.sort.options.missingAsc") as string },
      { value: "ingredientsDesc", label: t("dishCosts.sort.options.ingredientsDesc") as string },
      { value: "ingredientsAsc", label: t("dishCosts.sort.options.ingredientsAsc") as string },
    ],
    [t],
  );

  const sortedDishCosts = useMemo(() => {
    const list = filteredDishes.slice();
    list.sort((left, right) => {
      const leftDish = dishMap.get(left.dishId);
      const rightDish = dishMap.get(right.dishId);
      const leftName = leftDish?.name ?? "";
      const rightName = rightDish?.name ?? "";
      const leftCalories = leftDish?.calories ?? 0;
      const rightCalories = rightDish?.calories ?? 0;
      const leftIngredients = leftDish?.ingredients.length ?? 0;
      const rightIngredients = rightDish?.ingredients.length ?? 0;

      switch (sortMode) {
        case "nameAsc":
          return collator.compare(leftName, rightName);
        case "nameDesc":
          return collator.compare(rightName, leftName);
        case "costAsc":
          return left.totalCost - right.totalCost;
        case "caloriesDesc":
          return rightCalories - leftCalories;
        case "caloriesAsc":
          return leftCalories - rightCalories;
        case "missingDesc":
          return right.missingIngredients.length - left.missingIngredients.length;
        case "missingAsc":
          return left.missingIngredients.length - right.missingIngredients.length;
        case "ingredientsDesc":
          return rightIngredients - leftIngredients;
        case "ingredientsAsc":
          return leftIngredients - rightIngredients;
        case "costDesc":
        default:
          return right.totalCost - left.totalCost;
      }
    });
    return list;
  }, [filteredDishes, sortMode, dishMap, collator]);

  const totalFilteredCost = useMemo(
    () => filteredDishes.reduce((sum, dish) => sum + dish.totalCost, 0),
    [filteredDishes],
  );

  const averageFilteredCost = filteredDishes.length ? totalFilteredCost / filteredDishes.length : 0;

  const mealOptions = useMemo(
    () => [
      { value: "all", label: t("dishCosts.filters.meal.all") as string },
      ...MEAL_ORDER.map((slot) => ({ value: slot, label: t(MEAL_LABEL_KEYS[slot]) as string })),
    ],
    [t],
  );

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat(language === "uk" ? "uk-UA" : language === "pl" ? "pl-PL" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    [language],
  );

  const tableHeaders = useMemo(
    () => ({
      ingredient: t("dishCosts.table.columns.ingredient") as string,
      quantity: t("dishCosts.table.columns.quantity") as string,
      cost: t("dishCosts.table.columns.cost") as string,
    }),
    [t],
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t("dishCosts.title") as string}
        subtitle={t("dishCosts.subtitle") as string}
        titleAs="h1"
      />
      {analyticsError && (
        <InlineAlert tone="error" message={t("errors.loadAnalytics", { message: analyticsError }) as string} />
      )}
      {analyticsLoading && (
        <InlineAlert tone="info" message={t("app.loading") as string} />
      )}

      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">{t("dishCosts.filters.heading")}</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            <span>{t("dishCosts.filters.meal.label")}</span>
            <select
              className="rounded-xl border px-3 py-2"
              value={filters.meal}
              onChange={(event) => setFilters((prev) => ({ ...prev, meal: event.target.value }))}
            >
              {mealOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            <span>{t("dishCosts.filters.min")}</span>
            <input
              className="rounded-xl border px-3 py-2"
              inputMode="decimal"
              value={filters.minCost}
              onChange={(event) => setFilters((prev) => ({ ...prev, minCost: event.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            <span>{t("dishCosts.filters.max")}</span>
            <input
              className="rounded-xl border px-3 py-2"
              inputMode="decimal"
              value={filters.maxCost}
              onChange={(event) => setFilters((prev) => ({ ...prev, maxCost: event.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={filters.onlyScheduled}
              onChange={(event) => setFilters((prev) => ({ ...prev, onlyScheduled: event.target.checked }))}
            />
            <span>{t("dishCosts.filters.onlyScheduled")}</span>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">{t("dishCosts.summary.heading")}</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <SummaryCard
            label={t("dishCosts.summary.dishesTracked") as string}
            value={`${filteredDishes.length}/${dishes.length}`}
            tooltip={t("dishCosts.summary.dishesTrackedHint") as string}
          />
          <SummaryCard
            label={t("dishCosts.summary.averageCost") as string}
            value={filteredDishes.length ? currencyFormatter.format(averageFilteredCost) : "—"}
            tooltip={t("dishCosts.summary.averageCostHint") as string}
          />
          <SummaryCard
            label={t("dishCosts.summary.totalCost") as string}
            value={currencyFormatter.format(totalFilteredCost)}
            tooltip={t("dishCosts.summary.totalCostHint") as string}
          />
          <SummaryCard
            label={t("dishCosts.summary.missingData") as string}
            value={`${costStats.missingCount}`}
            tooltip={t("dishCosts.summary.missingDataHint") as string}
          />
          <SummaryCard
            label={t("dishCosts.summary.averageSpendPerDish") as string}
            value={
              filteredDishes.length
                ? currencyFormatter.format(averageFilteredCost)
                : "—"
            }
            tooltip={t("dishCosts.summary.averageSpendPerDishHint") as string}
          />
          <SummaryCard
            label={t("dishCosts.summary.costShare") as string}
            value={
              costStats.totalSpent
                ? `${new Intl.NumberFormat(undefined, {
                    style: "percent",
                    minimumFractionDigits: 1,
                  }).format(
                    totalFilteredCost / costStats.totalSpent,
                  )}`
                : "—"
            }
            tooltip={t("dishCosts.summary.costShareHint") as string}
          />
          <SummaryCard
            label={t("dishCosts.summary.avgCalories") as string}
            value={
              filteredDishes.length
                ? `${Math.round(
                    filteredDishes.reduce(
                      (sum, dishCost) => sum + (dishMap.get(dishCost.dishId)?.calories ?? 0),
                      0,
                    ) / filteredDishes.length,
                  )} kcal`
                : "—"
            }
            tooltip={t("dishCosts.summary.avgCaloriesHint") as string}
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">{t("dishCosts.table.heading")}</h2>
          <label className="text-xs text-gray-500">
            {t("dishCosts.sort.label")}
            <select
              className="mt-1 block w-full rounded-xl border px-3 py-2 text-sm text-gray-700"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {filteredDishes.length === 0 ? (
          <EmptyState title={t("dishCosts.table.empty") as string} />
        ) : (
          <div className="space-y-4">
            {sortedDishCosts.map((summary) => {
              const dish = dishMap.get(summary.dishId);
              if (!dish) return null;
              return (
                <DishCard
                  key={summary.dishId}
                  summary={summary}
                  dish={dish}
                  currencyFormatter={currencyFormatter}
                  ingredientOptions={ingredients}
                  language={language}
                  headers={tableHeaders}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  tooltip?: string;
}

function SummaryCard({ label, value, tooltip }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3" title={tooltip}>
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}

interface DishCardProps {
  summary: DishCostSummary;
  dish: Dish;
  currencyFormatter: Intl.NumberFormat;
  ingredientOptions: IngredientOption[];
  language: Language;
  headers: {
    ingredient: string;
    quantity: string;
    cost: string;
  };
}

function DishCard({ summary, dish, currencyFormatter, ingredientOptions, language, headers }: DishCardProps) {
  const collator = useMemo(
    () => new Intl.Collator(language, { sensitivity: "base" }),
    [language],
  );
  const optionMap = useMemo(() => {
    const map = new Map<string, IngredientOption>();
    ingredientOptions.forEach((option) => map.set(option.name, option));
    return map;
  }, [ingredientOptions]);
  const ingredientLabel = useCallback(
    (name: string, unit: string) => {
      const option = optionMap.get(name) ?? {
        key: "",
        name,
        unit,
        translations: {},
      };
      return getIngredientOptionLabel(option, language);
    },
    [optionMap, language],
  );
  const sortedIngredients = useMemo(
    () =>
      [...summary.ingredients].sort((left, right) =>
        collator.compare(
          ingredientLabel(left.ingredient, left.unit),
          ingredientLabel(right.ingredient, right.unit),
        ),
      ),
    [summary.ingredients, collator, ingredientLabel],
  );
  const sortedMissing = useMemo(
    () =>
      [...summary.missingIngredients].sort((left, right) =>
        collator.compare(
          ingredientLabel(left.ingredient, left.unit),
          ingredientLabel(right.ingredient, right.unit),
        ),
      ),
    [summary.missingIngredients, collator, ingredientLabel],
  );

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{dish.name || "—"}</h3>
          <p className="text-sm text-gray-500">{dish.ingredients.length} ingredients</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">{currencyFormatter.format(summary.totalCost)}</div>
          {summary.missingIngredients.length > 0 && (
            <div className="text-xs text-amber-600">
              Missing {summary.missingIngredients.length} ingredient{summary.missingIngredients.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="py-2 pr-4">{headers.ingredient}</th>
            <th className="py-2 pr-4">{headers.quantity}</th>
            <th className="py-2 pr-4">{headers.cost}</th>
          </tr>
        </thead>
        <tbody>
          {sortedIngredients.map((item) => (
            <tr key={item.ingredient} className="border-b last:border-none">
              <td className="py-2 pr-4">
                {ingredientLabel(item.ingredient, item.unit)}
              </td>
              <td className="py-2 pr-4 text-gray-600">
                {item.amount} {item.unit}
              </td>
              <td className="py-2 pr-4 text-gray-900">{currencyFormatter.format(item.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {summary.missingIngredients.length > 0 && (
        <div className="mt-3 text-xs text-amber-700">
          Missing price data for:{" "}
          {sortedMissing.map((item) => `${item.ingredient} (${item.unit})`).join(", ")}
        </div>
      )}
    </div>
  );
}
