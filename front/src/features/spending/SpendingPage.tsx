import { useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "../../i18n";
import type { CalorieEntry, IngredientOption, PurchaseEntry } from "../../types";
import { getIngredientOptionLabel, getLocalizedIngredientName } from "../../utils/ingredientNames";
import { computeUnitPrice } from "../../utils/pricing";
import { calculateSpendStats, calculateNutritionStats } from "../../utils/statistics";

interface SummaryCardProps {
  label: string;
  value: string;
  tooltip?: string;
}

function SummaryCard({ label, value, tooltip }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3" title={tooltip}>
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}

interface SpendingPageProps {
  ingredients: IngredientOption[];
  purchases: PurchaseEntry[];
  calorieEntries: CalorieEntry[];
  onRefresh?: () => Promise<void>;
}

interface FiltersState {
  start: string;
  end: string;
  ingredientKey: string;
}

export function SpendingPage({ ingredients, purchases, calorieEntries, onRefresh }: SpendingPageProps) {
  const { t, language } = useTranslation();
  const locale = language === "uk" ? "uk-UA" : language === "pl" ? "pl-PL" : "en-US";

  const [filters, setFilters] = useState<FiltersState>({
    start: "",
    end: "",
    ingredientKey: "",
  });
  const [reloading, setReloading] = useState(false);

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [locale],
  );
  const quantityFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 3 }),
    [locale],
  );
  const percentFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    [locale],
  );
  const calorieFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    [locale],
  );
  const formatUnit = (value: string): string => {
    const label = t(`units.${value}`);
    return label.startsWith("units.") ? value : label;
  };

  const ingredientMap = useMemo(() => {
    const map = new Map<string, IngredientOption>();
    ingredients.forEach((item) => map.set(item.key, item));
    return map;
  }, [ingredients]);

  const hasRequestedInitialRefresh = useRef(false);
  useEffect(() => {
    if (!onRefresh || hasRequestedInitialRefresh.current) return;
    hasRequestedInitialRefresh.current = true;
    void onRefresh();
  }, [onRefresh]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((purchase) => {
      if (filters.ingredientKey && purchase.ingredientKey !== filters.ingredientKey) {
        return false;
      }
      if (filters.start) {
        const startDate = new Date(`${filters.start}T00:00:00`);
        if (new Date(purchase.purchasedAt) < startDate) {
          return false;
        }
      }
      if (filters.end) {
        const endDate = new Date(`${filters.end}T23:59:59.999`);
        if (new Date(purchase.purchasedAt) > endDate) {
          return false;
        }
      }
      return true;
    });
  }, [filters, purchases]);

  const dailyTotals = useMemo(() => {
    const totals = new Map<string, number>();
    filteredPurchases.forEach((purchase) => {
      const key = purchase.purchasedAt.slice(0, 10);
      totals.set(key, (totals.get(key) ?? 0) + purchase.price);
    });
    return Array.from(totals.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredPurchases]);

  const totalSpent = useMemo(
    () => filteredPurchases.reduce((sum, purchase) => sum + purchase.price, 0),
    [filteredPurchases],
  );

  const currentStats = useMemo(() => calculateSpendStats(filteredPurchases), [filteredPurchases]);
  const globalStats = useMemo(() => calculateSpendStats(purchases), [purchases]);
  const { stats: nutritionStats, perIngredient: calorieBreakdown } = useMemo(
    () => calculateNutritionStats(filteredPurchases, calorieEntries),
    [filteredPurchases, calorieEntries],
  );

  const normalizedUnitLabel = currentStats.normalizedUnit
    ? (t(`spending.summary.unitLabels.${currentStats.normalizedUnit}`) as string)
    : null;
  const normalizedQuantityValue = currentStats.totalNormalizedQuantity && normalizedUnitLabel
    ? `${new Intl.NumberFormat(locale, {
        minimumFractionDigits: currentStats.normalizedUnit === "pcs" ? 0 : 2,
        maximumFractionDigits: currentStats.normalizedUnit === "pcs" ? 0 : 2,
      }).format(currentStats.totalNormalizedQuantity)} ${normalizedUnitLabel}`
    : "—";
  const averageUnitPriceValue = currentStats.averageUnitPrice && normalizedUnitLabel
    ? `${currencyFormatter.format(currentStats.averageUnitPrice)} / ${normalizedUnitLabel}`
    : "—";
  const daysTrackedValue = currentStats.daysTracked > 0 ? `${currentStats.daysTracked}` : "—";
  const averagePerPurchaseValue = filteredPurchases.length
    ? currencyFormatter.format(totalSpent / filteredPurchases.length)
    : "—";

  const hasCalorieData = nutritionStats.purchasesWithCalories > 0;
  const totalCaloriesValue = hasCalorieData
    ? `${calorieFormatter.format(nutritionStats.totalCalories)} kcal`
    : filteredPurchases.length
      ? `0 kcal`
      : "—";
  const averageDailyCaloriesValue = hasCalorieData
    ? `${calorieFormatter.format(nutritionStats.averageDailyCalories)} kcal`
    : "—";
  const caloriesPerPurchaseValue = hasCalorieData
    ? `${calorieFormatter.format(nutritionStats.caloriesPerPurchase)} kcal`
    : "—";

  const topSpenders = useMemo(() => {
    if (!filteredPurchases.length) return [] as Array<{
      key: string;
      total: number;
      share: number;
      count: number;
      averageUnitPrice: number | null;
      unitLabel?: string;
    }>;

    const buckets = new Map<string, { total: number; count: number; unitPriceSum: number; unitPriceCount: number; unitLabel?: string }>();
    filteredPurchases.forEach((purchase) => {
      const bucket = buckets.get(purchase.ingredientKey) ?? { total: 0, count: 0, unitPriceSum: 0, unitPriceCount: 0 };
      bucket.total += purchase.price;
      bucket.count += 1;
      const unitPriceInfo = computeUnitPrice(purchase);
      if (unitPriceInfo) {
        bucket.unitPriceSum += unitPriceInfo.pricePerUnit;
        bucket.unitPriceCount += 1;
        bucket.unitLabel = unitPriceInfo.unitLabel;
      }
      buckets.set(purchase.ingredientKey, bucket);
    });

    return Array.from(buckets.entries())
      .map(([key, info]) => ({
        key,
        total: info.total,
        count: info.count,
        share: totalSpent > 0 ? info.total / totalSpent : 0,
        averageUnitPrice: info.unitPriceCount > 0 ? info.unitPriceSum / info.unitPriceCount : null,
        unitLabel: info.unitLabel,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredPurchases, totalSpent]);

  const topCalorieItems = useMemo(() => {
    if (!calorieBreakdown.length || nutritionStats.totalCalories <= 0) return [];
    return calorieBreakdown
      .map((item) => ({
        key: item.ingredientKey,
        totalCalories: item.totalCalories,
        count: item.count,
        normalizedAmount: item.normalizedAmount,
        normalizedUnit: item.normalizedUnit,
      }))
      .slice(0, 5);
  }, [calorieBreakdown, nutritionStats.totalCalories]);

  const maxDailyTotal = dailyTotals.reduce((max, entry) => Math.max(max, entry.total), 0);

  async function handleReload() {
    if (!onRefresh) return;
    try {
      setReloading(true);
      await onRefresh();
    } finally {
      setReloading(false);
    }
  }

  const selectedIngredientName =
    filters.ingredientKey === ""
      ? t("spending.filters.allProducts")
      : getLocalizedIngredientName(
          ingredients,
          language,
          ingredients.find((ingredient) => ingredient.key === filters.ingredientKey)?.name ??
            filters.ingredientKey,
        );

  const historyEntries =
    filters.ingredientKey === ""
      ? filteredPurchases
      : filteredPurchases.filter((purchase) => purchase.ingredientKey === filters.ingredientKey);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("spending.title")}</h1>
          <p className="text-sm text-gray-500">{t("spending.subtitle")}</p>
        </div>
        <button
          className="rounded-xl border px-3 py-2 text-sm font-medium"
          onClick={handleReload}
          disabled={reloading}
        >
          {reloading ? "…" : (t("spending.reload") as string)}
        </button>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">{t("spending.filters.heading")}</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="block text-xs text-gray-500" htmlFor="spending-filter-start">
              {t("spending.filters.start")}
            </label>
            <input
              id="spending-filter-start"
              type="date"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={filters.start}
              onChange={(event) => setFilters((prev) => ({ ...prev, start: event.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500" htmlFor="spending-filter-end">
              {t("spending.filters.end")}
            </label>
            <input
              id="spending-filter-end"
              type="date"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={filters.end}
              onChange={(event) => setFilters((prev) => ({ ...prev, end: event.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500" htmlFor="spending-filter-ingredient">
              {t("spending.filters.ingredient")}
            </label>
            <select
              id="spending-filter-ingredient"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={filters.ingredientKey}
              onChange={(event) => setFilters((prev) => ({ ...prev, ingredientKey: event.target.value }))}
            >
              <option value="">{t("spending.filters.allProducts")}</option>
              {ingredients.map((ingredient) => (
                <option key={ingredient.key} value={ingredient.key}>
                  {getIngredientOptionLabel(ingredient, language)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <SummaryCard
            label={t("spending.summary.totalLabel") as string}
            value={currencyFormatter.format(totalSpent)}
            tooltip={t("spending.summary.totalHint") as string}
          />
          <SummaryCard
            label={t("spending.summary.avgDaily") as string}
            value={currencyFormatter.format(currentStats.averageDailySpend ?? 0)}
            tooltip={t("spending.summary.avgDailyHint") as string}
          />
          <SummaryCard
            label={t("spending.summary.medianDaily") as string}
            value={currencyFormatter.format(currentStats.medianDailySpend ?? 0)}
            tooltip={t("spending.summary.medianDailyHint") as string}
          />
          <SummaryCard
            label={t("spending.summary.daysTracked") as string}
            value={daysTrackedValue}
            tooltip={t("spending.summary.daysTrackedHint") as string}
          />
          <SummaryCard
            label={t("spending.summary.avgPurchase") as string}
            value={averagePerPurchaseValue}
            tooltip={t("spending.summary.avgPurchaseHint") as string}
          />
          <SummaryCard
            label={t("spending.summary.quantity") as string}
            value={normalizedQuantityValue}
            tooltip={t("spending.summary.quantityHint") as string}
          />
          <SummaryCard
            label={t("spending.summary.unitPrice") as string}
            value={averageUnitPriceValue}
            tooltip={t("spending.summary.unitPriceHint") as string}
          />
          <SummaryCard
            label={t("spending.summary.totalAll") as string}
            value={currencyFormatter.format(globalStats.totalSpent ?? 0)}
            tooltip={t("spending.summary.totalAllHint") as string}
          />
          <SummaryCard
            label={t("spending.summary.caloriesTotal") as string}
            value={totalCaloriesValue}
            tooltip={t("spending.summary.caloriesTotalHint") as string}
          />
          <SummaryCard
            label={t("spending.summary.caloriesAverage") as string}
            value={averageDailyCaloriesValue}
            tooltip={t("spending.summary.caloriesAverageHint") as string}
          />
          <SummaryCard
            label={t("spending.summary.caloriesPerPurchase") as string}
            value={caloriesPerPurchaseValue}
            tooltip={t("spending.summary.caloriesPerPurchaseHint") as string}
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">{t("spending.chart.heading")}</h2>
        {dailyTotals.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-gray-500">
            {t("spending.chart.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex min-w-full items-end gap-4">
              {dailyTotals.map(({ date, total }) => {
                const height = maxDailyTotal > 0 ? Math.max((total / maxDailyTotal) * 100, 6) : 0;
                return (
                  <div key={date} className="flex flex-col items-center gap-2">
                    <div className="flex h-40 w-10 items-end">
                      <div
                        className="w-full rounded-t-lg bg-gray-900"
                        style={{ height: `${height}%` }}
                        title={`${date}: ${currencyFormatter.format(total)}`}
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(`${date}T00:00:00`).toLocaleDateString(locale)}
                    </div>
                    <div className="text-xs font-medium text-gray-700">
                      {currencyFormatter.format(total)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t("spending.top.heading")}</h2>
          <p className="text-sm text-gray-500">{t("spending.top.subtitle")}</p>
        </div>
        {topSpenders.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-gray-500">
            {t("spending.top.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4">{t("spending.top.columns.ingredient")}</th>
                  <th className="py-2 pr-4">{t("spending.top.columns.total")}</th>
                  <th className="py-2 pr-4">{t("spending.top.columns.share")}</th>
                  <th className="py-2 pr-4">{t("spending.top.columns.purchases")}</th>
                  <th className="py-2 pr-4">{t("spending.top.columns.avgUnitPrice")}</th>
                </tr>
              </thead>
              <tbody>
                {topSpenders.map((entry) => {
                  const ingredient = ingredientMap.get(entry.key);
                  const ingredientName = ingredient
                    ? getIngredientOptionLabel(ingredient, language)
                    : entry.key;
                  const unitLabel = entry.unitLabel
                    ? (t(`spending.summary.unitLabels.${entry.unitLabel}`) as string)
                    : null;
                  const avgUnitPriceDisplay = entry.averageUnitPrice && unitLabel
                    ? `${currencyFormatter.format(entry.averageUnitPrice)} / ${unitLabel}`
                    : "—";
                  return (
                    <tr key={entry.key} className="border-b last:border-none">
                      <td className="py-2 pr-4 text-gray-900">{ingredientName}</td>
                      <td className="py-2 pr-4 text-gray-900">{currencyFormatter.format(entry.total)}</td>
                      <td className="py-2 pr-4 text-gray-600">{percentFormatter.format(entry.share)}</td>
                      <td className="py-2 pr-4 text-gray-600">{entry.count}</td>
                      <td className="py-2 pr-4 text-gray-600">{avgUnitPriceDisplay}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t("spending.caloriesTop.heading")}</h2>
          <p className="text-sm text-gray-500">{t("spending.caloriesTop.subtitle")}</p>
        </div>
        {topCalorieItems.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-gray-500">
            {t("spending.caloriesTop.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4">{t("spending.caloriesTop.columns.ingredient")}</th>
                  <th className="py-2 pr-4">{t("spending.caloriesTop.columns.calories")}</th>
                  <th className="py-2 pr-4">{t("spending.caloriesTop.columns.share")}</th>
                  <th className="py-2 pr-4">{t("spending.caloriesTop.columns.purchases")}</th>
                  <th className="py-2 pr-4">{t("spending.caloriesTop.columns.quantity")}</th>
                </tr>
              </thead>
              <tbody>
                {topCalorieItems.map((entry) => {
                  const ingredient = ingredientMap.get(entry.key);
                  const ingredientName = ingredient
                    ? getIngredientOptionLabel(ingredient, language)
                    : entry.key;
                  const unitLabel = entry.normalizedUnit
                    ? (t(`spending.summary.unitLabels.${entry.normalizedUnit}`) as string)
                    : null;
                  const quantityDisplay = unitLabel && entry.normalizedAmount
                    ? `${quantityFormatter.format(entry.normalizedAmount)} ${unitLabel}`
                    : "—";
                  const share = nutritionStats.totalCalories > 0
                    ? entry.totalCalories / nutritionStats.totalCalories
                    : 0;
                  return (
                    <tr key={entry.key} className="border-b last:border-none">
                      <td className="py-2 pr-4 text-gray-900">{ingredientName}</td>
                      <td className="py-2 pr-4 text-gray-900">
                        {calorieFormatter.format(entry.totalCalories)} kcal
                      </td>
                      <td className="py-2 pr-4 text-gray-600">{percentFormatter.format(share)}</td>
                      <td className="py-2 pr-4 text-gray-600">{entry.count}</td>
                      <td className="py-2 pr-4 text-gray-600">{quantityDisplay}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-gray-900">{t("spending.history.heading")}</h2>
          <p className="text-sm text-gray-500">{selectedIngredientName}</p>
        </div>
        {historyEntries.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-gray-500">
            {t("spending.history.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4">{t("spending.history.columns.date")}</th>
                  <th className="py-2 pr-4">{t("spending.history.columns.ingredient")}</th>
                  <th className="py-2 pr-4">{t("spending.history.columns.quantity")}</th>
                  <th className="py-2 pr-4">{t("spending.history.columns.price")}</th>
                  <th className="py-2 pr-4">{t("spending.history.columns.unitPrice")}</th>
                </tr>
              </thead>
              <tbody>
                {historyEntries
                  .slice()
                  .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))
                  .map((purchase) => {
                    const ingredientName = getLocalizedIngredientName(
                      ingredients,
                      language,
                      purchase.ingredientName,
                      purchase.unit,
                    );
                    const unitPriceInfo = computeUnitPrice(purchase);
                    return (
                      <tr key={purchase.id} className="border-b last:border-none">
                        <td className="py-2 pr-4 text-gray-600">
                          {new Date(purchase.purchasedAt).toLocaleString(locale)}
                        </td>
                        <td className="py-2 pr-4 text-gray-900">{ingredientName}</td>
                        <td className="py-2 pr-4 text-gray-600">
                          {quantityFormatter.format(purchase.amount)} {formatUnit(purchase.unit)}
                        </td>
                        <td className="py-2 pr-4 text-gray-900">
                          {currencyFormatter.format(purchase.price)}
                        </td>
                        <td className="py-2 pr-4 text-gray-600">
                          {unitPriceInfo
                            ? `${currencyFormatter.format(unitPriceInfo.pricePerUnit)} / ${unitPriceInfo.unitLabel}`
                            : "—"}
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
