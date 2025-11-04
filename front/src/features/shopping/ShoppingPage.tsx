import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "../../i18n";
import type { IngredientOption, ShoppingListItem, ShoppingListResponse } from "../../types";
import { addDays, startOfWeek, toDateISO } from "../../utils/dates";
import { getLocalizedIngredientName } from "../../utils/ingredientNames";

interface ShoppingPageProps {
  fetchList: (start: string, end: string) => Promise<ShoppingListResponse>;
  ingredientOptions: IngredientOption[];
}

export function ShoppingPage({ fetchList, ingredientOptions }: ShoppingPageProps) {
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
  const { t, language } = useTranslation();
  const formatUnit = (value: string): string => {
    const label = t(`units.${value}`);
    return label.startsWith("units.") ? value : label;
  };
  const resolveIngredientName = useCallback(
    (name: string, unit: string) =>
      getLocalizedIngredientName(ingredientOptions, language, name, unit),
    [ingredientOptions, language],
  );
  const localizedItems = useMemo(
    () =>
      items.map((item) => ({
        item,
        displayName: resolveIngredientName(item.name, item.unit),
      })),
    [items, resolveIngredientName],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchList(rangeStart, rangeEnd);
        if (!cancelled) {
          setItems(data.items);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : undefined;
          setError(t("errors.shopping", { message: message ?? t("common.unknownError") }));
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rangeStart, rangeEnd, fetchList, t]);

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
    return `${item.name.toLowerCase()}__${item.unit.toLowerCase()}`;
  }

  function toggleItem(item: ShoppingListItem) {
    const key = shoppingKey(item);
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
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
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{t("shopping.title")}</h3>
          <ExportButton
            items={items}
            disabled={!items.length}
            resolveIngredientName={resolveIngredientName}
          />
        </div>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-gray-500">{t("shopping.loading")}</div>
        ) : localizedItems.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 w-12">{t("shopping.columns.done")}</th>
                <th className="py-2">{t("shopping.columns.product")}</th>
                <th className="py-2">{t("shopping.columns.quantity")}</th>
                <th className="py-2">{t("shopping.columns.unit")}</th>
              </tr>
            </thead>
            <tbody>
              {localizedItems.map(({ item, displayName }) => (
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
                  <td className="py-2">{Number(item.qty.toFixed(2))}</td>
                  <td className="py-2">{formatUnit(item.unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-gray-500">{t("shopping.empty")}</div>
        )}
      </div>
    </div>
  );
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
        (item) =>
          `• ${resolveIngredientName(item.name, item.unit)}: ${Number(item.qty.toFixed(2))} ${formatUnit(item.unit)} (${item.dishes.join(", ") || "—"})`,
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
