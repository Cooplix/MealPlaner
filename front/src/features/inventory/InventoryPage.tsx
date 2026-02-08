import { useMemo, useState } from "react";
import { useTranslation } from "../../i18n";

type InventoryTab = "products" | "catFood";

export function InventoryPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<InventoryTab>("products");
  const hints = useMemo(() => {
    return [
      t("inventory.hints.products"),
      t("inventory.hints.catFood"),
      t("inventory.hints.status"),
    ];
  }, [t]);

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
        <div className="flex flex-wrap gap-3">
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
            {t("inventory.filters.search")}
          </div>
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
            {t("inventory.filters.category")}
          </div>
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
            {t("inventory.filters.location")}
          </div>
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
            {t("inventory.filters.status")}
          </div>
        </div>
        <div className="mt-6 border-t border-dashed border-gray-200 pt-6">
          <div className="text-sm font-semibold text-gray-800">
            {activeTab === "products"
              ? t("inventory.table.productsTitle")
              : t("inventory.table.catFoodTitle")}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {t("inventory.table.placeholder")}
          </p>
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
