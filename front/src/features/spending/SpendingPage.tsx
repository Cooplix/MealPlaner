import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "../../components/EmptyState";
import { InlineAlert } from "../../components/InlineAlert";
import { InfoCard } from "../../components/InfoCard";
import { SectionHeader } from "../../components/SectionHeader";
import { api } from "../../api";
import { useTranslation } from "../../i18n";
import type { CalorieEntry, IngredientOption, PurchaseEntry, SpendingAnalyticsResponse } from "../../types";
import { getIngredientOptionLabel, getLocalizedIngredientName } from "../../utils/ingredientNames";
import { computeUnitPrice } from "../../utils/pricing";

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
  const collator = useMemo(
    () => new Intl.Collator(locale, { sensitivity: "base" }),
    [locale],
  );

  const [filters, setFilters] = useState<FiltersState>({
    start: "",
    end: "",
    ingredientKey: "",
  });
  const [historySort, setHistorySort] = useState("dateDesc");
  const [topSort, setTopSort] = useState("totalDesc");
  const [caloriesSort, setCaloriesSort] = useState("caloriesDesc");
  const [reloading, setReloading] = useState(false);
  const [analytics, setAnalytics] = useState<SpendingAnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

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

  const sortedIngredients = useMemo(
    () =>
      [...ingredients].sort((left, right) =>
        collator.compare(
          getIngredientOptionLabel(left, language),
          getIngredientOptionLabel(right, language),
        ),
      ),
    [ingredients, collator, language],
  );

  const hasRequestedInitialRefresh = useRef(false);
  useEffect(() => {
    if (!onRefresh || hasRequestedInitialRefresh.current) return;
    hasRequestedInitialRefresh.current = true;
    void onRefresh();
  }, [onRefresh]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const data = await api.getSpendingAnalytics({
        start: filters.start || undefined,
        end: filters.end || undefined,
        ingredientKey: filters.ingredientKey || undefined,
      });
      setAnalytics(data);
      setAnalyticsError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? t("common.unknownError"));
      setAnalyticsError(message);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [filters.start, filters.end, filters.ingredientKey, t]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics, purchases.length, calorieEntries.length]);

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

  const totals = analytics?.totals ?? null;
  const allTimeTotals = analytics?.allTime ?? null;
  const dailyTotals = useMemo(() => analytics?.dailyTotals ?? [], [analytics]);
  const topSpenders = useMemo(() => analytics?.topSpenders ?? [], [analytics]);
  const nutritionStats = analytics?.nutrition ?? null;
  const topCalorieItems = useMemo(() => analytics?.topCalories ?? [], [analytics]);
  const totalSpent = totals?.totalSpent ?? 0;
  const hasAnalytics = analytics !== null;

  const normalizedUnitLabel = totals?.normalizedUnit
    ? (t(`spending.summary.unitLabels.${totals.normalizedUnit}`) as string)
    : null;
  const normalizedQuantityValue = totals?.totalNormalizedQuantity && normalizedUnitLabel
    ? `${new Intl.NumberFormat(locale, {
        minimumFractionDigits: totals.normalizedUnit === "pcs" ? 0 : 2,
        maximumFractionDigits: totals.normalizedUnit === "pcs" ? 0 : 2,
      }).format(totals.totalNormalizedQuantity)} ${normalizedUnitLabel}`
    : "—";
  const averageUnitPriceValue = totals?.averageUnitPrice && normalizedUnitLabel
    ? `${currencyFormatter.format(totals.averageUnitPrice)} / ${normalizedUnitLabel}`
    : "—";
  const daysTrackedValue = totals && totals.daysTracked > 0 ? `${totals.daysTracked}` : "—";
  const averagePerPurchaseValue = analytics && analytics.purchaseCount > 0
    ? currencyFormatter.format(totals?.averagePurchase ?? 0)
    : "—";

  const hasCalorieData = (nutritionStats?.purchasesWithCalories ?? 0) > 0;
  const totalCaloriesValue = hasCalorieData
    ? `${calorieFormatter.format(nutritionStats?.totalCalories ?? 0)} kcal`
    : analytics && analytics.purchaseCount > 0
      ? `0 kcal`
      : "—";
  const averageDailyCaloriesValue = hasCalorieData
    ? `${calorieFormatter.format(nutritionStats?.averageDailyCalories ?? 0)} kcal`
    : "—";
  const caloriesPerPurchaseValue = hasCalorieData
    ? `${calorieFormatter.format(nutritionStats?.caloriesPerPurchase ?? 0)} kcal`
    : "—";

  const maxDailyTotal = dailyTotals.reduce((max, entry) => Math.max(max, entry.total), 0);

  const spendTrend7d = useMemo(() => {
    const sorted = dailyTotals.slice().sort((left, right) => left.date.localeCompare(right.date));
    const last = sorted.slice(-7);
    const prev = sorted.slice(-14, -7);
    if (last.length === 0 || prev.length === 0) return null;

    const sumLast = last.reduce((sum, entry) => sum + entry.total, 0);
    const sumPrev = prev.reduce((sum, entry) => sum + entry.total, 0);
    if (!(sumPrev > 0)) {
      return { sumLast, delta: null as string | null, deltaTone: "neutral" as const };
    }

    const ratio = (sumLast - sumPrev) / sumPrev;
    const threshold = 0.05;
    const direction = Math.abs(ratio) < threshold ? "flat" : ratio > 0 ? "up" : "down";
    const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "●";
    const deltaTone = direction === "up" ? ("warn" as const) : direction === "down" ? ("success" as const) : ("neutral" as const);

    return {
      sumLast,
      delta: `${arrow} ${percentFormatter.format(Math.abs(ratio))}`,
      deltaTone,
    };
  }, [dailyTotals, percentFormatter]);

  const biggestDay = useMemo(() => {
    if (dailyTotals.length === 0) return null;
    return dailyTotals.reduce((best, entry) => (entry.total > best.total ? entry : best), dailyTotals[0]);
  }, [dailyTotals]);

  const topProduct = useMemo(() => {
    if (topSpenders.length === 0) return null;
    const best = topSpenders.reduce((best, entry) => (entry.total > best.total ? entry : best), topSpenders[0]);
    const option = ingredientMap.get(best.ingredientKey);
    const name = option ? getIngredientOptionLabel(option, language) : best.ingredientKey;
    return { name, total: best.total, share: best.share };
  }, [topSpenders, ingredientMap, language]);

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

  const historySortOptions = useMemo(
    () => [
      { value: "dateDesc", label: t("spending.history.sort.options.dateDesc") as string },
      { value: "dateAsc", label: t("spending.history.sort.options.dateAsc") as string },
      { value: "priceDesc", label: t("spending.history.sort.options.priceDesc") as string },
      { value: "priceAsc", label: t("spending.history.sort.options.priceAsc") as string },
      { value: "unitPriceDesc", label: t("spending.history.sort.options.unitPriceDesc") as string },
      { value: "unitPriceAsc", label: t("spending.history.sort.options.unitPriceAsc") as string },
      { value: "ingredientAsc", label: t("spending.history.sort.options.ingredientAsc") as string },
      { value: "ingredientDesc", label: t("spending.history.sort.options.ingredientDesc") as string },
      { value: "amountDesc", label: t("spending.history.sort.options.amountDesc") as string },
      { value: "amountAsc", label: t("spending.history.sort.options.amountAsc") as string },
    ],
    [t],
  );

  const topSortOptions = useMemo(
    () => [
      { value: "totalDesc", label: t("spending.top.sort.options.totalDesc") as string },
      { value: "totalAsc", label: t("spending.top.sort.options.totalAsc") as string },
      { value: "shareDesc", label: t("spending.top.sort.options.shareDesc") as string },
      { value: "shareAsc", label: t("spending.top.sort.options.shareAsc") as string },
      { value: "countDesc", label: t("spending.top.sort.options.countDesc") as string },
      { value: "countAsc", label: t("spending.top.sort.options.countAsc") as string },
      { value: "avgUnitPriceDesc", label: t("spending.top.sort.options.avgUnitPriceDesc") as string },
      { value: "avgUnitPriceAsc", label: t("spending.top.sort.options.avgUnitPriceAsc") as string },
      { value: "ingredientAsc", label: t("spending.top.sort.options.ingredientAsc") as string },
      { value: "ingredientDesc", label: t("spending.top.sort.options.ingredientDesc") as string },
    ],
    [t],
  );

  const caloriesSortOptions = useMemo(
    () => [
      { value: "caloriesDesc", label: t("spending.caloriesTop.sort.options.caloriesDesc") as string },
      { value: "caloriesAsc", label: t("spending.caloriesTop.sort.options.caloriesAsc") as string },
      { value: "shareDesc", label: t("spending.caloriesTop.sort.options.shareDesc") as string },
      { value: "shareAsc", label: t("spending.caloriesTop.sort.options.shareAsc") as string },
      { value: "countDesc", label: t("spending.caloriesTop.sort.options.countDesc") as string },
      { value: "countAsc", label: t("spending.caloriesTop.sort.options.countAsc") as string },
      { value: "quantityDesc", label: t("spending.caloriesTop.sort.options.quantityDesc") as string },
      { value: "quantityAsc", label: t("spending.caloriesTop.sort.options.quantityAsc") as string },
      { value: "ingredientAsc", label: t("spending.caloriesTop.sort.options.ingredientAsc") as string },
      { value: "ingredientDesc", label: t("spending.caloriesTop.sort.options.ingredientDesc") as string },
    ],
    [t],
  );

  const ingredientLabelForKey = useCallback(
    (key: string) => {
      const ingredient = ingredientMap.get(key);
      return ingredient ? getIngredientOptionLabel(ingredient, language) : key;
    },
    [ingredientMap, language],
  );

  const sortedTopSpenders = useMemo(() => {
    const list = topSpenders.slice();
    list.sort((left, right) => {
      const leftName = ingredientLabelForKey(left.ingredientKey);
      const rightName = ingredientLabelForKey(right.ingredientKey);
      switch (topSort) {
        case "totalAsc":
          return left.total - right.total;
        case "shareDesc":
          return right.share - left.share;
        case "shareAsc":
          return left.share - right.share;
        case "countDesc":
          return right.count - left.count;
        case "countAsc":
          return left.count - right.count;
        case "avgUnitPriceDesc":
          return (right.averageUnitPrice ?? 0) - (left.averageUnitPrice ?? 0);
        case "avgUnitPriceAsc":
          return (left.averageUnitPrice ?? 0) - (right.averageUnitPrice ?? 0);
        case "ingredientDesc":
          return collator.compare(rightName, leftName);
        case "ingredientAsc":
          return collator.compare(leftName, rightName);
        case "totalDesc":
        default:
          return right.total - left.total;
      }
    });
    return list;
  }, [topSpenders, topSort, ingredientLabelForKey, collator]);

  const sortedTopCalories = useMemo(() => {
    const list = topCalorieItems.slice();
    list.sort((left, right) => {
      const leftName = ingredientLabelForKey(left.ingredientKey);
      const rightName = ingredientLabelForKey(right.ingredientKey);
      const leftShare = (nutritionStats?.totalCalories ?? 0) > 0
        ? left.totalCalories / (nutritionStats?.totalCalories ?? 1)
        : 0;
      const rightShare = (nutritionStats?.totalCalories ?? 0) > 0
        ? right.totalCalories / (nutritionStats?.totalCalories ?? 1)
        : 0;
      switch (caloriesSort) {
        case "caloriesAsc":
          return left.totalCalories - right.totalCalories;
        case "shareDesc":
          return rightShare - leftShare;
        case "shareAsc":
          return leftShare - rightShare;
        case "countDesc":
          return right.count - left.count;
        case "countAsc":
          return left.count - right.count;
        case "quantityDesc":
          return (right.normalizedAmount ?? 0) - (left.normalizedAmount ?? 0);
        case "quantityAsc":
          return (left.normalizedAmount ?? 0) - (right.normalizedAmount ?? 0);
        case "ingredientDesc":
          return collator.compare(rightName, leftName);
        case "ingredientAsc":
          return collator.compare(leftName, rightName);
        case "caloriesDesc":
        default:
          return right.totalCalories - left.totalCalories;
      }
    });
    return list;
  }, [topCalorieItems, caloriesSort, ingredientLabelForKey, collator, nutritionStats]);

  const sortedHistory = useMemo(() => {
    const rows = historyEntries.map((purchase) => {
      const ingredientName = getLocalizedIngredientName(
        ingredients,
        language,
        purchase.ingredientName,
        purchase.unit,
      );
      const unitPriceInfo = computeUnitPrice(purchase);
      const unitPriceValue = unitPriceInfo ? unitPriceInfo.pricePerUnit : 0;
      const purchaseDate = new Date(purchase.purchasedAt).getTime();
      return { purchase, ingredientName, unitPriceValue, purchaseDate };
    });
    rows.sort((left, right) => {
      switch (historySort) {
        case "dateAsc":
          return left.purchaseDate - right.purchaseDate;
        case "priceDesc":
          return right.purchase.price - left.purchase.price;
        case "priceAsc":
          return left.purchase.price - right.purchase.price;
        case "unitPriceDesc":
          return right.unitPriceValue - left.unitPriceValue;
        case "unitPriceAsc":
          return left.unitPriceValue - right.unitPriceValue;
        case "ingredientDesc":
          return collator.compare(right.ingredientName, left.ingredientName);
        case "ingredientAsc":
          return collator.compare(left.ingredientName, right.ingredientName);
        case "amountDesc":
          return right.purchase.amount - left.purchase.amount;
        case "amountAsc":
          return left.purchase.amount - right.purchase.amount;
        case "dateDesc":
        default:
          return right.purchaseDate - left.purchaseDate;
      }
    });
    return rows;
  }, [historyEntries, ingredients, language, historySort, collator]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t("spending.title") as string}
        subtitle={t("spending.subtitle") as string}
        titleAs="h1"
        actions={
          <button
            className="rounded-xl border px-3 py-2 text-sm font-medium"
            onClick={handleReload}
            disabled={reloading}
          >
            {reloading ? "…" : (t("spending.reload") as string)}
          </button>
        }
      />

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
              {sortedIngredients.map((ingredient) => (
                <option key={ingredient.key} value={ingredient.key}>
                  {getIngredientOptionLabel(ingredient, language)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {analyticsError && (
          <InlineAlert tone="error" message={t("errors.loadAnalytics", { message: analyticsError }) as string} />
        )}
        {analyticsLoading && (
          <InlineAlert tone="info" message={t("app.loading") as string} />
        )}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <InfoCard
            label={t("spending.summary.totalLabel") as string}
            value={hasAnalytics ? currencyFormatter.format(totalSpent) : "—"}
            tooltip={t("spending.summary.totalHint") as string}
          />
          <InfoCard
            label={t("spending.summary.avgDaily") as string}
            value={totals ? currencyFormatter.format(totals.averageDailySpend ?? 0) : "—"}
            tooltip={t("spending.summary.avgDailyHint") as string}
          />
          <InfoCard
            label={t("spending.summary.medianDaily") as string}
            value={totals ? currencyFormatter.format(totals.medianDailySpend ?? 0) : "—"}
            tooltip={t("spending.summary.medianDailyHint") as string}
          />
          <InfoCard
            label={t("spending.summary.daysTracked") as string}
            value={daysTrackedValue}
            tooltip={t("spending.summary.daysTrackedHint") as string}
          />
          <InfoCard
            label={t("spending.summary.avgPurchase") as string}
            value={averagePerPurchaseValue}
            tooltip={t("spending.summary.avgPurchaseHint") as string}
          />
          <InfoCard
            label={t("spending.summary.quantity") as string}
            value={normalizedQuantityValue}
            tooltip={t("spending.summary.quantityHint") as string}
          />
          <InfoCard
            label={t("spending.summary.unitPrice") as string}
            value={averageUnitPriceValue}
            tooltip={t("spending.summary.unitPriceHint") as string}
          />
          <InfoCard
            label={t("spending.summary.totalAll") as string}
            value={allTimeTotals ? currencyFormatter.format(allTimeTotals.totalSpent ?? 0) : "—"}
            tooltip={t("spending.summary.totalAllHint") as string}
          />
          <InfoCard
            label={t("spending.summary.caloriesTotal") as string}
            value={totalCaloriesValue}
            tooltip={t("spending.summary.caloriesTotalHint") as string}
          />
          <InfoCard
            label={t("spending.summary.caloriesAverage") as string}
            value={averageDailyCaloriesValue}
            tooltip={t("spending.summary.caloriesAverageHint") as string}
          />
          <InfoCard
            label={t("spending.summary.caloriesPerPurchase") as string}
            value={caloriesPerPurchaseValue}
            tooltip={t("spending.summary.caloriesPerPurchaseHint") as string}
          />
        </div>

        <div className="pt-2 space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">{t("spending.insights.heading")}</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <InfoCard
              label={t("spending.insights.trend7d") as string}
              value={spendTrend7d ? currencyFormatter.format(spendTrend7d.sumLast) : "—"}
              delta={spendTrend7d?.delta ?? undefined}
              deltaTone={spendTrend7d?.deltaTone}
              hint={t("spending.insights.trend7dHint") as string}
              tone={spendTrend7d?.deltaTone ?? "neutral"}
            />
            <InfoCard
              label={t("spending.insights.biggestDay") as string}
              value={biggestDay ? currencyFormatter.format(biggestDay.total) : "—"}
              hint={
                biggestDay
                  ? new Date(`${biggestDay.date}T00:00:00`).toLocaleDateString(locale)
                  : undefined
              }
              tone={
                biggestDay && totals?.averageDailySpend && biggestDay.total > totals.averageDailySpend * 2
                  ? "warn"
                  : "neutral"
              }
            />
            <InfoCard
              label={t("spending.insights.topProduct") as string}
              value={topProduct?.name ?? "—"}
              hint={
                topProduct
                  ? `${currencyFormatter.format(topProduct.total)} · ${percentFormatter.format(topProduct.share)}`
                  : undefined
              }
              tone={topProduct && topProduct.share >= 0.35 ? "warn" : topProduct ? "info" : "neutral"}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">{t("spending.chart.heading")}</h2>
        {dailyTotals.length === 0 ? (
          <EmptyState title={t("spending.chart.empty") as string} />
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t("spending.top.heading")}</h2>
            <p className="text-sm text-gray-500">{t("spending.top.subtitle")}</p>
          </div>
          <label className="text-xs text-gray-500">
            {t("spending.top.sort.label")}
            <select
              className="mt-1 block w-full rounded-xl border px-3 py-2 text-sm text-gray-700"
              value={topSort}
              onChange={(event) => setTopSort(event.target.value)}
            >
              {topSortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {topSpenders.length === 0 ? (
          <EmptyState title={t("spending.top.empty") as string} />
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
                {sortedTopSpenders.map((entry) => {
                  const ingredient = ingredientMap.get(entry.ingredientKey);
                  const ingredientName = ingredient
                    ? getIngredientOptionLabel(ingredient, language)
                    : entry.ingredientKey;
                  const unitLabel = entry.unitLabel
                    ? (t(`spending.summary.unitLabels.${entry.unitLabel}`) as string)
                    : null;
                  const avgUnitPriceDisplay = entry.averageUnitPrice && unitLabel
                    ? `${currencyFormatter.format(entry.averageUnitPrice)} / ${unitLabel}`
                    : "—";
                  return (
                    <tr key={entry.ingredientKey} className="border-b last:border-none">
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t("spending.caloriesTop.heading")}</h2>
            <p className="text-sm text-gray-500">{t("spending.caloriesTop.subtitle")}</p>
          </div>
          <label className="text-xs text-gray-500">
            {t("spending.caloriesTop.sort.label")}
            <select
              className="mt-1 block w-full rounded-xl border px-3 py-2 text-sm text-gray-700"
              value={caloriesSort}
              onChange={(event) => setCaloriesSort(event.target.value)}
            >
              {caloriesSortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {topCalorieItems.length === 0 ? (
          <EmptyState title={t("spending.caloriesTop.empty") as string} />
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
                {sortedTopCalories.map((entry) => {
                  const ingredient = ingredientMap.get(entry.ingredientKey);
                  const ingredientName = ingredient
                    ? getIngredientOptionLabel(ingredient, language)
                    : entry.ingredientKey;
                  const unitLabel = entry.normalizedUnit
                    ? (t(`spending.summary.unitLabels.${entry.normalizedUnit}`) as string)
                    : null;
                  const quantityDisplay = unitLabel && entry.normalizedAmount
                    ? `${quantityFormatter.format(entry.normalizedAmount)} ${unitLabel}`
                    : "—";
                  const share = (nutritionStats?.totalCalories ?? 0) > 0
                    ? entry.totalCalories / (nutritionStats?.totalCalories ?? 0)
                    : 0;
                  return (
                    <tr key={entry.ingredientKey} className="border-b last:border-none">
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-gray-900">{t("spending.history.heading")}</h2>
            <p className="text-sm text-gray-500">{selectedIngredientName}</p>
          </div>
          <label className="text-xs text-gray-500">
            {t("spending.history.sort.label")}
            <select
              className="mt-1 block w-full rounded-xl border px-3 py-2 text-sm text-gray-700"
              value={historySort}
              onChange={(event) => setHistorySort(event.target.value)}
            >
              {historySortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {historyEntries.length === 0 ? (
          <EmptyState title={t("spending.history.empty") as string} />
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
                {sortedHistory.map(({ purchase, ingredientName }) => {
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
