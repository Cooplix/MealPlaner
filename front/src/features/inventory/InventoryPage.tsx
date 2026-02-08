import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function InventoryPage() {
  const { t } = useTranslation();
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
