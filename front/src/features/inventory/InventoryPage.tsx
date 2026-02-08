import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "../../i18n";
import { inventoryApi } from "./api";
import { getExpiryStatus, getRestockStatus, getToBuy } from "./inventoryStatus";
import type { InventoryFilters, InventoryItem } from "./types";

type InventoryTab = "products" | "catFood";

export function InventoryPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<InventoryTab>("products");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InventoryFilters>({
    search: "",
    category: "all",
    location: "all",
    status: "all",
  });
  const hints = useMemo(() => {
    return [
      t("inventory.hints.products"),
      t("inventory.hints.catFood"),
      t("inventory.hints.status"),
    ];
  }, [t]);

  useEffect(() => {
    let ignore = false;
    if (activeTab !== "products") {
      return;
    }
    setLoading(true);
    setError(null);
    inventoryApi
      .listItems()
      .then((data) => {
        if (!ignore) {
          setItems(data);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const message = err instanceof Error ? err.message : String(err);
          setError(message);
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [activeTab]);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    items.forEach((item) => {
      if (item.category) unique.add(item.category);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const locations = useMemo(() => {
    const unique = new Set<string>();
    items.forEach((item) => {
      if (item.location) unique.add(item.location);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const search = filters.search.trim().toLowerCase();
      if (search) {
        const hay = `${item.name} ${item.baseName ?? ""}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      if (filters.category !== "all" && item.category !== filters.category) return false;
      if (filters.location !== "all" && item.location !== filters.location) return false;

      if (filters.status !== "all") {
        const expiry = getExpiryStatus(item.expiresAt);
        const restock = getRestockStatus(item.quantity, item.minQty);
        if (filters.status === "expired" && expiry !== "EXPIRED") return false;
        if (filters.status === "soon" && !(expiry === "<=14d" || expiry === "<=30d"))
          return false;
        if (filters.status === "restock" && restock !== "RESTOCK") return false;
      }
      return true;
    });
  }, [items, filters]);

  function updateFilter<K extends keyof InventoryFilters>(key: K, value: InventoryFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{t("inventory.title")}</h1>
        <p className="text-sm text-gray-500">{t("inventory.subtitle")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            activeTab === "products"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
          onClick={() => setActiveTab("products")}
        >
          {t("inventory.tabs.products")}
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            activeTab === "catFood"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
          onClick={() => setActiveTab("catFood")}
        >
          {t("inventory.tabs.catFood")}
        </button>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-gray-400">
              {t("inventory.filters.search")}
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder={t("inventory.filters.searchPlaceholder") as string}
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-gray-400">
              {t("inventory.filters.category")}
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={filters.category}
              onChange={(event) => updateFilter("category", event.target.value)}
            >
              <option value="all">{t("inventory.filters.all")}</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-gray-400">
              {t("inventory.filters.location")}
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={filters.location}
              onChange={(event) => updateFilter("location", event.target.value)}
            >
              <option value="all">{t("inventory.filters.all")}</option>
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-gray-400">
              {t("inventory.filters.status")}
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value as InventoryFilters["status"])}
            >
              <option value="all">{t("inventory.filters.all")}</option>
              <option value="expired">{t("inventory.filters.expired")}</option>
              <option value="soon">{t("inventory.filters.soon")}</option>
              <option value="restock">{t("inventory.filters.restock")}</option>
            </select>
          </div>
        </div>
        <div className="mt-6 border-t border-dashed border-gray-200 pt-6">
          <div className="text-sm font-semibold text-gray-800">
            {activeTab === "products"
              ? t("inventory.table.productsTitle")
              : t("inventory.table.catFoodTitle")}
          </div>
          {activeTab === "products" && (
            <div className="mt-4">
              {loading && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  {t("inventory.table.loading")}
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {t("inventory.table.error", { message: error })}
                </div>
              )}
              {!loading && !error && filteredItems.length === 0 && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  {t("inventory.table.empty")}
                </div>
              )}
              {!loading && !error && filteredItems.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-3 py-2">{t("inventory.table.columns.name")}</th>
                        <th className="px-3 py-2">{t("inventory.table.columns.quantity")}</th>
                        <th className="px-3 py-2">{t("inventory.table.columns.expiry")}</th>
                        <th className="px-3 py-2">{t("inventory.table.columns.status")}</th>
                        <th className="px-3 py-2">{t("inventory.table.columns.toBuy")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredItems.map((item) => {
                        const expiry = getExpiryStatus(item.expiresAt);
                        const restock = getRestockStatus(item.quantity, item.minQty);
                        const toBuy = getToBuy(item.quantity, item.minQty, item.maxQty);
                        return (
                          <tr key={item.id} className="bg-white">
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900">{item.name}</div>
                              <div className="text-xs text-gray-500">
                                {item.category ?? t("inventory.table.unknown")}
                                {" · "}
                                {item.location ?? t("inventory.table.unknown")}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="px-3 py-2">
                              {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : "—"}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col text-xs text-gray-600">
                                <span>{t(`inventory.status.expiry.${expiry}`)}</span>
                                <span>{t(`inventory.status.restock.${restock}`)}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {toBuy > 0 ? `${toBuy} ${item.unit}` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {activeTab === "catFood" && (
            <p className="mt-1 text-sm text-gray-500">
              {t("inventory.table.placeholder")}
            </p>
          )}
        </div>
      </div>
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6">
        <div className="text-sm font-semibold text-gray-800">{t("inventory.placeholderTitle")}</div>
        <p className="mt-2 text-sm text-gray-600">{t("inventory.placeholderBody")}</p>
        <ul className="mt-4 space-y-2 text-sm text-gray-600">
          {hints.map((hint, index) => (
            <li key={index} className="flex gap-2">
              <span className="text-gray-400">•</span>
              <span>{hint}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
