import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "../../i18n";
import type { IngredientOption, ShoppingListItem, ShoppingListResponse } from "../../types";
import { addDays, startOfWeek, toDateISO } from "../../utils/dates";
import { getLocalizedIngredientName } from "../../utils/ingredientNames";
import { inventoryApi } from "../inventory/api";
import type { InventoryItem } from "../inventory/types";

interface ShoppingPageProps {
  fetchList: (start: string, end: string) => Promise<ShoppingListResponse>;
  ingredientOptions: IngredientOption[];
  categories: string[];
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
}

export function ShoppingPage({
  fetchList,
  ingredientOptions,
  categories,
  locations,
  onCreatePurchase,
}: ShoppingPageProps) {
  const [rangeStart, setRangeStart] = useState<string>(() => {
    const monday = startOfWeek(new Date());
    return toDateISO(monday);
  });
  const [rangeEnd, setRangeEnd] = useState<string>(() => {
    const monday = startOfWeek(new Date());
    return toDateISO(addDays(monday, 6));
  });
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [purchaseDrafts, setPurchaseDrafts] = useState<Record<string, { amount: string; price: string }>>({});
  const [purchaseLocation, setPurchaseLocation] = useState<string>("");
  const [purchaseApplyToInventory, setPurchaseApplyToInventory] = useState(true);
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchasedAt, setPurchasedAt] = useState<string>(() => formatDateTimeLocal(new Date()));
  const [sortMode, setSortMode] = useState("nameAsc");
  const { t, language } = useTranslation();
  const collator = useMemo(
    () => new Intl.Collator(language, { sensitivity: "base" }),
    [language],
  );
  const formatUnit = (value: string): string => {
    const label = t(`units.${value}`);
    return label.startsWith("units.") ? value : label;
  };
  const resolveIngredientName = useCallback(
    (name: string, unit: string) =>
      getLocalizedIngredientName(ingredientOptions, language, name, unit),
    [ingredientOptions, language],
  );
  const unknownCategory = t("inventory.table.unknown");

  const locationOptions = useMemo(() => {
    const unique = new Set<string>(locations);
    inventoryItems.forEach((item) => {
      if (item.location) unique.add(item.location);
    });
    return Array.from(unique).sort((a, b) => collator.compare(a, b));
  }, [locations, inventoryItems, collator]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => collator.compare(a, b)),
    [categories, collator],
  );
  const localizedItems = useMemo(
    () =>
      items.map((item) => ({
        item,
        displayName: resolveIngredientName(item.name, item.unit),
        requiredQty:
          typeof item.requiredQty === "number" && Number.isFinite(item.requiredQty)
            ? item.requiredQty
            : item.qty,
        inStockQty:
          typeof item.inStockQty === "number" && Number.isFinite(item.inStockQty)
            ? item.inStockQty
            : 0,
        toBuyQty:
          typeof item.toBuyQty === "number" && Number.isFinite(item.toBuyQty)
            ? item.toBuyQty
            : item.qty,
      })),
    [items, resolveIngredientName],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchList(rangeStart, rangeEnd);
      setItems(data.items);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      setError(t("errors.shopping", { message: message ?? t("common.unknownError") }));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [fetchList, rangeStart, rangeEnd, t]);

  const loadInventory = useCallback(async () => {
    try {
      const data = await inventoryApi.listItems();
      setInventoryItems(data);
      setInventoryError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      setInventoryError(message ?? t("common.unknownError"));
      setInventoryItems([]);
    }
  }, [t]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    setChecked((prev) => {
      const next: Record<string, boolean> = {};
      items.forEach((item) => {
        const key = shoppingKey(item);
        next[key] = prev[key] ?? false;
      });
      return next;
    });
  }, [items]);

  function shoppingKey(item: ShoppingListItem): string {
    if (item.ingredientKey && item.ingredientKey.trim()) {
      return item.ingredientKey.trim().toLowerCase();
    }
    return `${item.name.toLowerCase()}__${item.unit.toLowerCase()}`;
  }

  function toggleItem(item: ShoppingListItem) {
    const key = shoppingKey(item);
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  useEffect(() => {
    setPurchaseDrafts((prev) => {
      const next: Record<string, { amount: string; price: string }> = {};
      localizedItems.forEach(({ item, toBuyQty }) => {
        const key = shoppingKey(item);
        if (checked[key]) {
          const amount =
            typeof toBuyQty === "number" && Number.isFinite(toBuyQty)
              ? toBuyQty.toFixed(2)
              : item.qty.toFixed(2);
          next[key] = prev[key] ?? { amount, price: "" };
        }
      });
      return next;
    });
  }, [checked, localizedItems]);

  useEffect(() => {
    if (!locationOptions.length) return;
    if (!purchaseLocation || !locationOptions.includes(purchaseLocation)) {
      setPurchaseLocation(locationOptions[0] ?? "");
    }
  }, [locationOptions, purchaseLocation]);

  const categoryLookup = useMemo(() => {
    const byKey = new Map<string, string>();
    const byNameUnit = new Map<string, string>();
    inventoryItems.forEach((item) => {
      if (item.ingredientKey && item.category) {
        byKey.set(item.ingredientKey.trim().toLowerCase(), item.category);
      }
      if (item.name && item.unit && item.category) {
        const key = `${item.name.toLowerCase()}__${item.unit.toLowerCase()}`;
        byNameUnit.set(key, item.category);
      }
    });
    return { byKey, byNameUnit };
  }, [inventoryItems]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, typeof localizedItems>();
    localizedItems.forEach((entry) => {
      const key = entry.item.ingredientKey?.trim().toLowerCase();
      const nameKey = `${entry.item.name.toLowerCase()}__${entry.item.unit.toLowerCase()}`;
      const category =
        (key ? categoryLookup.byKey.get(key) : undefined) ??
        categoryLookup.byNameUnit.get(nameKey) ??
        unknownCategory;
      const existing = groups.get(category) ?? [];
      groups.set(category, [...existing, entry]);
    });

    const ordered: Array<{ category: string; entries: typeof localizedItems }> = [];
    const seen = new Set<string>();
    sortedCategories.forEach((category) => {
      const entries = groups.get(category);
      if (entries && entries.length) {
        ordered.push({ category, entries });
        seen.add(category);
      }
    });
    Array.from(groups.entries())
      .filter(([category]) => !seen.has(category) && category !== unknownCategory)
      .sort(([left], [right]) => left.localeCompare(right))
      .forEach(([category, entries]) => ordered.push({ category, entries }));
    if (groups.has(unknownCategory)) {
      ordered.push({ category: unknownCategory, entries: groups.get(unknownCategory) ?? [] });
    }
    return ordered;
  }, [localizedItems, categoryLookup, sortedCategories, unknownCategory]);

  const sortOptions = useMemo(
    () => [
      { value: "nameAsc", label: t("shopping.sort.options.nameAsc") as string },
      { value: "nameDesc", label: t("shopping.sort.options.nameDesc") as string },
      { value: "toBuyDesc", label: t("shopping.sort.options.toBuyDesc") as string },
      { value: "toBuyAsc", label: t("shopping.sort.options.toBuyAsc") as string },
      { value: "requiredDesc", label: t("shopping.sort.options.requiredDesc") as string },
      { value: "requiredAsc", label: t("shopping.sort.options.requiredAsc") as string },
      { value: "inStockDesc", label: t("shopping.sort.options.inStockDesc") as string },
      { value: "inStockAsc", label: t("shopping.sort.options.inStockAsc") as string },
    ],
    [t],
  );

  const sortedGroupedItems = useMemo(() => {
    const sortEntries = (entries: typeof localizedItems) => {
      const list = entries.slice();
      list.sort((left, right) => {
        const leftName = left.displayName ?? "";
        const rightName = right.displayName ?? "";
        const leftRequired = Number.isFinite(left.requiredQty) ? left.requiredQty : left.item.qty;
        const rightRequired = Number.isFinite(right.requiredQty) ? right.requiredQty : right.item.qty;
        const leftInStock = Number.isFinite(left.inStockQty) ? left.inStockQty : 0;
        const rightInStock = Number.isFinite(right.inStockQty) ? right.inStockQty : 0;
        const leftToBuy = Number.isFinite(left.toBuyQty) ? left.toBuyQty : left.item.qty;
        const rightToBuy = Number.isFinite(right.toBuyQty) ? right.toBuyQty : right.item.qty;

        switch (sortMode) {
          case "nameDesc":
            return collator.compare(rightName, leftName);
          case "toBuyDesc":
            return rightToBuy - leftToBuy;
          case "toBuyAsc":
            return leftToBuy - rightToBuy;
          case "requiredDesc":
            return rightRequired - leftRequired;
          case "requiredAsc":
            return leftRequired - rightRequired;
          case "inStockDesc":
            return rightInStock - leftInStock;
          case "inStockAsc":
            return leftInStock - rightInStock;
          case "nameAsc":
          default:
            return collator.compare(leftName, rightName);
        }
      });
      return list;
    };
    return groupedItems.map((group) => ({
      category: group.category,
      entries: sortEntries(group.entries),
    }));
  }, [groupedItems, collator, sortMode]);

  const selectedEntries = useMemo(
    () =>
      localizedItems.filter(({ item, toBuyQty }) => {
        const key = shoppingKey(item);
        if (!checked[key]) return false;
        return typeof toBuyQty === "number" ? toBuyQty > 0 : item.qty > 0;
      }),
    [localizedItems, checked],
  );

  const sortedSelectedEntries = useMemo(
    () =>
      selectedEntries
        .slice()
        .sort((left, right) => collator.compare(left.displayName ?? "", right.displayName ?? "")),
    [selectedEntries, collator],
  );

  async function handleCreatePurchases() {
    if (!selectedEntries.length) return;
    setPurchaseError(null);
    const purchasedAtValue = new Date(purchasedAt);
    if (Number.isNaN(purchasedAtValue.getTime())) {
      setPurchaseError(t("shopping.purchase.errors.purchasedAt"));
      return;
    }
    const payloads: Array<{
      ingredientKey: string;
      amount: number;
      unit: string;
      price: number;
    }> = [];

    for (const entry of selectedEntries) {
      const key = shoppingKey(entry.item);
      const draft = purchaseDrafts[key];
      const amountValue = Number.parseFloat((draft?.amount ?? "").replace(",", "."));
      const priceValueRaw = (draft?.price ?? "").replace(",", ".");
      const priceValue = priceValueRaw ? Number.parseFloat(priceValueRaw) : 0;
      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        setPurchaseError(t("shopping.purchase.errors.amount"));
        return;
      }
      if (!Number.isFinite(priceValue) || priceValue < 0) {
        setPurchaseError(t("shopping.purchase.errors.price"));
        return;
      }
      if (!entry.item.ingredientKey) {
        setPurchaseError(t("shopping.purchase.errors.ingredientKey"));
        return;
      }
      payloads.push({
        ingredientKey: entry.item.ingredientKey,
        amount: amountValue,
        unit: entry.item.unit,
        price: priceValue,
      });
    }

    setPurchaseSubmitting(true);
    try {
      for (const payload of payloads) {
        await onCreatePurchase({
          ...payload,
          purchasedAt: purchasedAtValue.toISOString(),
          applyToInventory: purchaseApplyToInventory,
          location: purchaseApplyToInventory && purchaseLocation ? purchaseLocation : undefined,
        });
      }
      setChecked({});
      setPurchaseDrafts({});
      setPurchaseError(null);
      setPurchasedAt(formatDateTimeLocal(new Date()));
      await loadInventory();
      await loadList();
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      setPurchaseError(message ?? t("common.unknownError"));
    } finally {
      setPurchaseSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-gray-900">{t("shopping.dateRange")}</h3>
        <div className="mt-2 grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-600">{t("shopping.start")}</label>
            <input
              type="date"
              className="w-full px-3 py-2 rounded-xl border"
              value={rangeStart}
              onChange={(event) => setRangeStart(event.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600">{t("shopping.end")}</label>
            <input
              type="date"
              className="w-full px-3 py-2 rounded-xl border"
              value={rangeEnd}
              onChange={(event) => setRangeEnd(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-900">{t("shopping.title")}</h3>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <span>{t("shopping.sort.label")}</span>
              <select
                className="rounded-xl border px-3 py-2 text-sm"
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
            <ExportButton
              items={items}
              disabled={!items.length}
              resolveIngredientName={resolveIngredientName}
            />
          </div>
        </div>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-gray-500">{t("shopping.loading")}</div>
        ) : sortedGroupedItems.length ? (
          <div className="space-y-6">
            {inventoryError && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {t("shopping.purchase.inventoryWarning", { message: inventoryError })}
              </div>
            )}
            {sortedGroupedItems.map(({ category, entries }) => (
              <div key={category} className="space-y-2">
                <div className="text-sm font-semibold text-gray-700">{category}</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 w-12">{t("shopping.columns.done")}</th>
                      <th className="py-2">{t("shopping.columns.product")}</th>
                      <th className="py-2">{t("shopping.columns.required")}</th>
                      <th className="py-2">{t("shopping.columns.inStock")}</th>
                      <th className="py-2">{t("shopping.columns.toBuy")}</th>
                      <th className="py-2">{t("shopping.columns.unit")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(({ item, displayName, requiredQty, inStockQty, toBuyQty }) => (
                      <tr key={item.name + item.unit} className="border-b">
                        <td className="py-2">
                          <input
                            type="checkbox"
                            aria-label={`${t("shopping.columns.product")}: ${displayName}`}
                            checked={checked[shoppingKey(item)] ?? false}
                            onChange={() => toggleItem(item)}
                          />
                        </td>
                        <td className="py-2">{displayName}</td>
                        <td className="py-2">{Number(requiredQty.toFixed(2))}</td>
                        <td className="py-2">{Number(inStockQty.toFixed(2))}</td>
                        <td className="py-2">{Number(toBuyQty.toFixed(2))}</td>
                        <td className="py-2">{formatUnit(item.unit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">{t("shopping.empty")}</div>
        )}
      </div>
      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{t("shopping.purchase.heading")}</h3>
            <p className="text-sm text-gray-500">{t("shopping.purchase.subtitle")}</p>
          </div>
        </div>
        {!selectedEntries.length ? (
          <div className="text-sm text-gray-500">{t("shopping.purchase.empty")}</div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-sm text-gray-600">{t("shopping.purchase.purchasedAt")}</label>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  value={purchasedAt}
                  onChange={(event) => setPurchasedAt(event.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">{t("inventory.form.fields.location")}</label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  value={purchaseLocation}
                  onChange={(event) => setPurchaseLocation(event.target.value)}
                  disabled={!purchaseApplyToInventory}
                >
                  {locationOptions.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-gray-900"
                    checked={purchaseApplyToInventory}
                    onChange={(event) => setPurchaseApplyToInventory(event.target.checked)}
                  />
                  {t("purchases.form.applyToInventory")}
                </label>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b text-gray-500">
                    <th className="py-2 pr-4">{t("shopping.purchase.columns.product")}</th>
                    <th className="py-2 pr-4">{t("shopping.purchase.columns.amount")}</th>
                    <th className="py-2 pr-4">{t("shopping.purchase.columns.unit")}</th>
                    <th className="py-2 pr-4">{t("shopping.purchase.columns.price")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSelectedEntries.map(({ item, displayName }) => {
                    const key = shoppingKey(item);
                    const draft = purchaseDrafts[key] ?? { amount: "", price: "" };
                    return (
                      <tr key={key} className="border-b last:border-none">
                        <td className="py-2 pr-4">{displayName}</td>
                        <td className="py-2 pr-4">
                          <input
                            className="w-28 rounded-lg border px-2 py-1"
                            inputMode="decimal"
                            value={draft.amount}
                            onChange={(event) =>
                              setPurchaseDrafts((prev) => ({
                                ...prev,
                                [key]: { ...draft, amount: event.target.value },
                              }))
                            }
                          />
                        </td>
                        <td className="py-2 pr-4 text-gray-600">{formatUnit(item.unit)}</td>
                        <td className="py-2 pr-4">
                          <input
                            className="w-28 rounded-lg border px-2 py-1"
                            inputMode="decimal"
                            value={draft.price}
                            onChange={(event) =>
                              setPurchaseDrafts((prev) => ({
                                ...prev,
                                [key]: { ...draft, price: event.target.value },
                              }))
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {purchaseError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {purchaseError}
              </div>
            )}
            <div>
              <button
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                disabled={purchaseSubmitting}
                onClick={handleCreatePurchases}
              >
                {purchaseSubmitting ? "…" : (t("shopping.purchase.submit") as string)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatDateTimeLocal(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

interface ExportButtonProps {
  items: ShoppingListItem[];
  disabled: boolean;
  resolveIngredientName: (name: string, unit: string) => string;
}

function ExportButton({ items, disabled, resolveIngredientName }: ExportButtonProps) {
  const { t } = useTranslation();
  const formatUnit = (value: string): string => {
    const label = t(`units.${value}`);
    return label.startsWith("units.") ? value : label;
  };
  function asText() {
    return items
      .map(
        (item) => {
          const requiredQty =
            typeof item.requiredQty === "number" && Number.isFinite(item.requiredQty)
              ? item.requiredQty
              : item.qty;
          const inStockQty =
            typeof item.inStockQty === "number" && Number.isFinite(item.inStockQty)
              ? item.inStockQty
              : 0;
          const toBuyQty =
            typeof item.toBuyQty === "number" && Number.isFinite(item.toBuyQty)
              ? item.toBuyQty
              : item.qty;
          return `• ${resolveIngredientName(item.name, item.unit)}: ${Number(toBuyQty.toFixed(2))} ${formatUnit(item.unit)} (need ${Number(requiredQty.toFixed(2))}, stock ${Number(inStockQty.toFixed(2))}) (${item.dishes.join(", ") || "—"})`;
        },
      )
      .join("\n");
  }

  function copy() {
    navigator.clipboard.writeText(asText());
  }

  function download() {
    const blob = new Blob([asText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `shopping_list_${toDateISO(new Date())}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-2">
      <button className="text-sm px-2 py-1 rounded-lg border" onClick={copy} disabled={disabled}>
        {t("shopping.copy")}
      </button>
      <button className="text-sm px-2 py-1 rounded-lg border" onClick={download} disabled={disabled}>
        {t("shopping.download")}
      </button>
    </div>
  );
}
