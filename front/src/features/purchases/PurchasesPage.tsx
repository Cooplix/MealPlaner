import { useEffect, useMemo, useRef, useState } from "react";

import { MEASUREMENT_UNITS } from "../../constants/measurementUnits";
import { useTranslation } from "../../i18n";
import type { IngredientOption, PurchaseEntry } from "../../types";
import { getIngredientOptionLabel, getLocalizedIngredientName } from "../../utils/ingredientNames";
import { computeUnitPrice } from "../../utils/pricing";

interface PurchasesPageProps {
  ingredients: IngredientOption[];
  purchases: PurchaseEntry[];
  units: string[];
  locations: string[];
  onCreatePurchase: (payload: {
    ingredientKey: string;
    amount: number;
    unit: string;
    price: number;
    purchasedAt: string;
    applyToInventory: boolean;
    location?: string;
  }) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

interface FiltersState {
  start: string;
  end: string;
  ingredientKey: string;
}

interface FormState {
  ingredientKey: string;
  amount: string;
  unit: string;
  price: string;
  purchasedAt: string;
  applyToInventory: boolean;
  location: string;
}

const DEFAULT_LOCATIONS = ["Комора", "Холодильник", "Морозилка"];

function formatDateTimeLocal(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

function toIsoString(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

export function PurchasesPage({
  ingredients,
  purchases,
  units,
  locations,
  onCreatePurchase,
  onRefresh,
}: PurchasesPageProps) {
  const { t, language } = useTranslation();
  const locale = language === "uk" ? "uk-UA" : language === "pl" ? "pl-PL" : "en-US";
  const collator = useMemo(
    () => new Intl.Collator(locale, { sensitivity: "base" }),
    [locale],
  );
  const unitOptions = units.length ? units : Array.from(MEASUREMENT_UNITS);
  const locationOptions = locations.length ? locations : DEFAULT_LOCATIONS;

  const initialIngredient = ingredients[0];
  const [formState, setFormState] = useState<FormState>(() => ({
    ingredientKey: initialIngredient?.key ?? "",
    amount: "1",
    unit: initialIngredient?.unit ?? unitOptions[0] ?? "",
    price: "",
    purchasedAt: formatDateTimeLocal(new Date()),
    applyToInventory: true,
    location: locationOptions[0] ?? "",
  }));
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [filters, setFilters] = useState<FiltersState>({
    start: "",
    end: "",
    ingredientKey: "",
  });
  const [sortMode, setSortMode] = useState("dateDesc");

  const [reloading, setReloading] = useState(false);

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [locale],
  );
  const quantityFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 3 }),
    [locale],
  );

  const formatUnit = useCallback(
    (value: string): string => {
      const label = t(`units.${value}`);
      return label.startsWith("units.") ? value : label;
    },
    [t],
  );

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

  const sortedUnitOptions = useMemo(
    () => [...unitOptions].sort((a, b) => collator.compare(formatUnit(a), formatUnit(b))),
    [unitOptions, collator, formatUnit],
  );

  const sortedLocationOptions = useMemo(
    () => [...locationOptions].sort((a, b) => collator.compare(a, b)),
    [locationOptions, collator],
  );

  const ingredientMap = useMemo(() => {
    const map = new Map<string, IngredientOption>();
    ingredients.forEach((ingredient) => map.set(ingredient.key, ingredient));
    return map;
  }, [ingredients]);

  const hasRequestedInitialRefresh = useRef(false);
  useEffect(() => {
    if (!onRefresh || hasRequestedInitialRefresh.current) return;
    hasRequestedInitialRefresh.current = true;
    void onRefresh();
  }, [onRefresh]);

  useEffect(() => {
    if (!ingredients.length) return;
    if (!ingredientMap.has(formState.ingredientKey)) {
      const fallback = ingredients[0];
      setFormState((prev) => ({
        ...prev,
        ingredientKey: fallback.key,
        unit: fallback.unit ?? unitOptions[0] ?? "",
      }));
    }
  }, [ingredients, ingredientMap, formState.ingredientKey, unitOptions]);

  useEffect(() => {
    if (!unitOptions.length) return;
    if (!formState.unit || !unitOptions.includes(formState.unit)) {
      setFormState((prev) => ({
        ...prev,
        unit: unitOptions[0] ?? "",
      }));
    }
  }, [unitOptions, formState.unit]);

  useEffect(() => {
    if (!locationOptions.length) return;
    if (!formState.location || !locationOptions.includes(formState.location)) {
      setFormState((prev) => ({
        ...prev,
        location: locationOptions[0] ?? "",
      }));
    }
  }, [locationOptions, formState.location]);

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

  const totalSpent = useMemo(
    () => filteredPurchases.reduce((total, purchase) => total + purchase.price, 0),
    [filteredPurchases],
  );

  const totalLabel = currencyFormatter.format(totalSpent);

  const sortOptions = useMemo(
    () => [
      { value: "dateDesc", label: t("purchases.sort.options.dateDesc") as string },
      { value: "dateAsc", label: t("purchases.sort.options.dateAsc") as string },
      { value: "priceDesc", label: t("purchases.sort.options.priceDesc") as string },
      { value: "priceAsc", label: t("purchases.sort.options.priceAsc") as string },
      { value: "unitPriceDesc", label: t("purchases.sort.options.unitPriceDesc") as string },
      { value: "unitPriceAsc", label: t("purchases.sort.options.unitPriceAsc") as string },
      { value: "ingredientAsc", label: t("purchases.sort.options.ingredientAsc") as string },
      { value: "ingredientDesc", label: t("purchases.sort.options.ingredientDesc") as string },
      { value: "amountDesc", label: t("purchases.sort.options.amountDesc") as string },
      { value: "amountAsc", label: t("purchases.sort.options.amountAsc") as string },
    ],
    [t],
  );

  const sortedPurchases = useMemo(() => {
    const rows = filteredPurchases.map((purchase) => {
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
      switch (sortMode) {
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
  }, [filteredPurchases, ingredients, language, collator, sortMode]);

  const handleFormChange = (patch: Partial<FormState>) => {
    setFormState((prev) => ({ ...prev, ...patch }));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formState.ingredientKey) {
      setFormError(t("purchases.validation.ingredient") as string);
      return;
    }
    const parsedAmount = Number.parseFloat(formState.amount.replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError(t("purchases.validation.amount") as string);
      return;
    }
    const parsedPrice = Number.parseFloat(formState.price.replace(",", "."));
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFormError(t("purchases.validation.price") as string);
      return;
    }
    if (!formState.purchasedAt) {
      setFormError(t("purchases.validation.purchasedAt") as string);
      return;
    }

    setSubmitting(true);
    try {
      await onCreatePurchase({
        ingredientKey: formState.ingredientKey,
        amount: parsedAmount,
        unit: formState.unit,
        price: parsedPrice,
        purchasedAt: toIsoString(formState.purchasedAt),
        applyToInventory: formState.applyToInventory,
        location: formState.applyToInventory ? (formState.location.trim() || undefined) : undefined,
      });
      setFormSuccess(t("purchases.messages.saved") as string);
      setFormState((prev) => ({
        ...prev,
        amount: "1",
        price: "",
        purchasedAt: formatDateTimeLocal(new Date()),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? "unknown error");
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReload() {
    if (!onRefresh) return;
    try {
      setReloading(true);
      await onRefresh();
    } finally {
      setReloading(false);
    }
  }

  function resetFilters() {
    setFilters({
      start: "",
      end: "",
      ingredientKey: "",
    });
  }

  const purchaseCountLabel = t("purchases.summary.count", { count: filteredPurchases.length }) as string;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("purchases.title")}</h1>
          <p className="text-sm text-gray-500">{t("purchases.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-xl border px-3 py-2 text-sm font-medium"
            onClick={handleReload}
            disabled={reloading}
          >
            {reloading ? "…" : (t("purchases.reload") as string)}
          </button>
        </div>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{t("purchases.form.heading")}</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-5" onSubmit={handleSubmit}>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600" htmlFor="purchase-ingredient">
              {t("purchases.form.ingredient")}
            </label>
            <select
              id="purchase-ingredient"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={formState.ingredientKey}
              onChange={(event) => {
                const key = event.target.value;
                const ingredient = ingredientMap.get(key);
                handleFormChange({
                  ingredientKey: key,
                  unit: ingredient?.unit ?? unitOptions[0] ?? "",
                });
              }}
            >
              {sortedIngredients.map((ingredient) => (
                <option key={ingredient.key} value={ingredient.key}>
                  {getIngredientOptionLabel(ingredient, language)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600" htmlFor="purchase-amount">
              {t("purchases.form.amount")}
            </label>
            <input
              id="purchase-amount"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              inputMode="decimal"
              value={formState.amount}
              onChange={(event) => handleFormChange({ amount: event.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600" htmlFor="purchase-unit">
              {t("purchases.form.unit")}
            </label>
            <select
              id="purchase-unit"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={formState.unit}
              onChange={(event) => handleFormChange({ unit: event.target.value })}
            >
              {sortedUnitOptions.map((value) => (
                <option key={value} value={value}>
                  {formatUnit(value)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600" htmlFor="purchase-price">
              {t("purchases.form.price")}
            </label>
            <input
              id="purchase-price"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              inputMode="decimal"
              value={formState.price}
              onChange={(event) => handleFormChange({ price: event.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600" htmlFor="purchase-date">
              {t("purchases.form.purchasedAt")}
            </label>
            <input
              id="purchase-date"
              type="datetime-local"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={formState.purchasedAt}
              onChange={(event) => handleFormChange({ purchasedAt: event.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600" htmlFor="purchase-location">
              {t("inventory.form.fields.location")}
            </label>
            <select
              id="purchase-location"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={formState.location}
              onChange={(event) => handleFormChange({ location: event.target.value })}
              disabled={!formState.applyToInventory}
            >
              {sortedLocationOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              disabled={submitting || !ingredients.length}
            >
              {submitting ? "…" : (t("purchases.form.submit") as string)}
            </button>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-gray-900"
                checked={formState.applyToInventory}
                onChange={(event) => handleFormChange({ applyToInventory: event.target.checked })}
              />
              {t("purchases.form.applyToInventory")}
            </label>
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {formSuccess}
              </div>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t("purchases.table.heading")}</h2>
          <p className="text-sm text-gray-500">
            {t("purchases.summary.total", { value: totalLabel }) as string} · {purchaseCountLabel}
          </p>
        </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500" htmlFor="purchases-filter-start">
                {t("purchases.filters.start")}
              </label>
              <input
                id="purchases-filter-start"
                type="date"
                className="mt-1 rounded-xl border px-3 py-2 text-sm"
                value={filters.start}
                onChange={(event) => setFilters((prev) => ({ ...prev, start: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500" htmlFor="purchases-filter-end">
                {t("purchases.filters.end")}
              </label>
              <input
                id="purchases-filter-end"
                type="date"
                className="mt-1 rounded-xl border px-3 py-2 text-sm"
                value={filters.end}
                onChange={(event) => setFilters((prev) => ({ ...prev, end: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500" htmlFor="purchases-filter-ingredient">
                {t("purchases.filters.ingredient")}
              </label>
              <select
                id="purchases-filter-ingredient"
                className="mt-1 rounded-xl border px-3 py-2 text-sm"
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
            <div>
              <label className="block text-xs text-gray-500" htmlFor="purchases-filter-sort">
                {t("purchases.sort.label")}
              </label>
              <select
                id="purchases-filter-sort"
                className="mt-1 rounded-xl border px-3 py-2 text-sm"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value)}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="rounded-xl border px-3 py-2 text-sm font-medium"
              onClick={resetFilters}
            >
              {t("purchases.filters.reset")}
            </button>
          </div>
        </div>

        {filteredPurchases.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-gray-500">
            {t("purchases.table.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4">{t("purchases.table.columns.date")}</th>
                  <th className="py-2 pr-4">{t("purchases.table.columns.ingredient")}</th>
                  <th className="py-2 pr-4">{t("purchases.table.columns.quantity")}</th>
                  <th className="py-2 pr-4">{t("purchases.table.columns.price")}</th>
                  <th className="py-2 pr-4">{t("purchases.table.columns.unitPrice")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedPurchases.map(({ purchase, ingredientName }) => {
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
