import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "../../i18n";
import { inventoryApi } from "./api";
import { getExpiryStatus, getRestockStatus, getToBuy } from "./inventoryStatus";
import type { InventoryFilters, InventoryItem, PetFoodItem } from "./types";

type InventoryTab = "products" | "catFood";
type InventoryFormMode = "create" | "edit";

type InventoryFormState = {
  name: string;
  baseName: string;
  category: string;
  location: string;
  quantity: string;
  unit: string;
  minQty: string;
  maxQty: string;
  expiresAt: string;
  notes: string;
};

const EMPTY_FORM: InventoryFormState = {
  name: "",
  baseName: "",
  category: "",
  location: "",
  quantity: "",
  unit: "",
  minQty: "",
  maxQty: "",
  expiresAt: "",
  notes: "",
};

type ConsumeFormState = {
  itemId: string | null;
  amount: string;
};

type PetFormState = {
  manufacturer: string;
  productName: string;
  foodType: string;
  packageType: string;
  weight: string;
  weightUnit: string;
  quantity: string;
  minQty: string;
  maxQty: string;
  expiresAt: string;
  notes: string;
};

type InventoryEvent = {
  id: string;
  date: Date;
  label: string;
  kind: "expiry" | "restock";
};

export function InventoryPage() {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<InventoryTab>("products");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [petItems, setPetItems] = useState<PetFoodItem[]>([]);
  const [petLoading, setPetLoading] = useState(false);
  const [petError, setPetError] = useState<string | null>(null);
  const [petFormOpen, setPetFormOpen] = useState(false);
  const [petFormMode, setPetFormMode] = useState<InventoryFormMode>("create");
  const [petEditingId, setPetEditingId] = useState<string | null>(null);
  const [petFormError, setPetFormError] = useState<string | null>(null);
  const [petFormSubmitting, setPetFormSubmitting] = useState(false);
  const [petFormData, setPetFormData] = useState<PetFormState>({
    manufacturer: "",
    productName: "",
    foodType: "",
    packageType: "",
    weight: "",
    weightUnit: "",
    quantity: "",
    minQty: "",
    maxQty: "",
    expiresAt: "",
    notes: "",
  });
  const [petConsumeOpen, setPetConsumeOpen] = useState(false);
  const [petConsumeError, setPetConsumeError] = useState<string | null>(null);
  const [petConsumeSubmitting, setPetConsumeSubmitting] = useState(false);
  const [petConsumeForm, setPetConsumeForm] = useState<ConsumeFormState>({ itemId: null, amount: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<InventoryFormMode>("create");
  const [formData, setFormData] = useState<InventoryFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [consumeForm, setConsumeForm] = useState<ConsumeFormState>({ itemId: null, amount: "" });
  const [consumeOpen, setConsumeOpen] = useState(false);
  const [consumeError, setConsumeError] = useState<string | null>(null);
  const [consumeSubmitting, setConsumeSubmitting] = useState(false);
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
  const locale = language === "uk" ? "uk-UA" : language === "pl" ? "pl-PL" : "en-US";

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

  useEffect(() => {
    let ignore = false;
    if (activeTab !== "catFood") {
      return;
    }
    setPetLoading(true);
    setPetError(null);
    inventoryApi
      .listPetItems()
      .then((data) => {
        if (!ignore) {
          setPetItems(data);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const message = err instanceof Error ? err.message : String(err);
          setPetError(message);
        }
      })
      .finally(() => {
        if (!ignore) {
          setPetLoading(false);
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

  const upcomingEvents = useMemo<InventoryEvent[]>(() => {
    const now = new Date();
    const events: InventoryEvent[] = [];
    const addExpiry = (id: string, label: string, expiresAt?: string | null) => {
      if (!expiresAt) return;
      const date = new Date(expiresAt);
      if (Number.isNaN(date.getTime())) return;
      events.push({ id: `expiry-${id}`, date, label, kind: "expiry" });
    };
    const addRestock = (id: string, label: string, quantity: number, minQty?: number | null) => {
      if (minQty == null || quantity >= minQty) return;
      events.push({ id: `restock-${id}`, date: now, label, kind: "restock" });
    };

    items.forEach((item) => {
      const name = item.name;
      addExpiry(item.id, name, item.expiresAt);
      addRestock(item.id, name, item.quantity, item.minQty);
    });

    petItems.forEach((item) => {
      const name = `${item.manufacturer} ${item.productName}`.trim();
      addExpiry(item.id, name, item.expiresAt);
      addRestock(item.id, name, item.quantity, item.minQty);
    });

    return events
      .filter((event) => event.date >= new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 10);
  }, [items, petItems]);

  function updateFilter<K extends keyof InventoryFilters>(key: K, value: InventoryFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setFormMode("edit");
    setEditingId(item.id);
    setFormData({
      name: item.name ?? "",
      baseName: item.baseName ?? "",
      category: item.category ?? "",
      location: item.location ?? "",
      quantity: String(item.quantity ?? ""),
      unit: item.unit ?? "",
      minQty: item.minQty != null ? String(item.minQty) : "",
      maxQty: item.maxQty != null ? String(item.maxQty) : "",
      expiresAt: item.expiresAt ? item.expiresAt.slice(0, 10) : "",
      notes: item.notes ?? "",
    });
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    if (formSubmitting) return;
    setFormOpen(false);
    setFormError(null);
  }

  function openConsume(item: InventoryItem) {
    setConsumeForm({ itemId: item.id, amount: "" });
    setConsumeError(null);
    setConsumeOpen(true);
  }

  function closeConsume() {
    if (consumeSubmitting) return;
    setConsumeOpen(false);
    setConsumeError(null);
  }

  function openPetForm(mode: InventoryFormMode, item?: PetFoodItem) {
    setPetFormMode(mode);
    setPetEditingId(item?.id ?? null);
    setPetFormData({
      manufacturer: item?.manufacturer ?? "",
      productName: item?.productName ?? "",
      foodType: item?.foodType ?? "",
      packageType: item?.packageType ?? "",
      weight: item?.weight != null ? String(item.weight) : "",
      weightUnit: item?.weightUnit ?? "",
      quantity: item?.quantity != null ? String(item.quantity) : "",
      minQty: item?.minQty != null ? String(item.minQty) : "",
      maxQty: item?.maxQty != null ? String(item.maxQty) : "",
      expiresAt: item?.expiresAt ? item.expiresAt.slice(0, 10) : "",
      notes: item?.notes ?? "",
    });
    setPetFormError(null);
    setPetFormOpen(true);
  }

  function closePetForm() {
    if (petFormSubmitting) return;
    setPetFormOpen(false);
    setPetFormError(null);
  }

  function openPetConsume(item: PetFoodItem) {
    setPetConsumeForm({ itemId: item.id, amount: "" });
    setPetConsumeError(null);
    setPetConsumeOpen(true);
  }

  function closePetConsume() {
    if (petConsumeSubmitting) return;
    setPetConsumeOpen(false);
    setPetConsumeError(null);
  }

  function parseNumber(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) return null;
    return parsed;
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const name = formData.name.trim();
    const unit = formData.unit.trim();
    const quantity = parseNumber(formData.quantity);
    const minQty = parseNumber(formData.minQty);
    const maxQty = parseNumber(formData.maxQty);

    if (!name) {
      setFormError(t("inventory.form.errors.nameRequired") as string);
      return;
    }
    if (quantity == null) {
      setFormError(t("inventory.form.errors.quantityRequired") as string);
      return;
    }
    if (!unit) {
      setFormError(t("inventory.form.errors.unitRequired") as string);
      return;
    }
    if (minQty != null && maxQty != null && minQty > maxQty) {
      setFormError(t("inventory.form.errors.minMax") as string);
      return;
    }

    const payload = {
      name,
      baseName: formData.baseName.trim() || null,
      category: formData.category.trim() || null,
      location: formData.location.trim() || null,
      quantity,
      unit,
      minQty,
      maxQty,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
      notes: formData.notes.trim() || null,
    };

    try {
      setFormSubmitting(true);
      if (formMode === "create") {
        const created = await inventoryApi.createItem(payload);
        setItems((prev) => [created, ...prev]);
      } else if (editingId) {
        const updated = await inventoryApi.updateItem(editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      }
      setFormOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setFormError(t("inventory.form.errors.submit", { message }) as string);
    } finally {
      setFormSubmitting(false);
    }
  }

  async function submitConsume(event: React.FormEvent) {
    event.preventDefault();
    setConsumeError(null);
    const amount = parseNumber(consumeForm.amount);
    if (amount == null || amount <= 0) {
      setConsumeError(t("inventory.consume.errors.amountRequired") as string);
      return;
    }
    if (!consumeForm.itemId) {
      setConsumeError(t("inventory.consume.errors.unknownItem") as string);
      return;
    }
    try {
      setConsumeSubmitting(true);
      const updated = await inventoryApi.consumeItem(consumeForm.itemId, { amount });
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setConsumeOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setConsumeError(t("inventory.consume.errors.submit", { message }) as string);
    } finally {
      setConsumeSubmitting(false);
    }
  }

  async function submitPetForm(event: React.FormEvent) {
    event.preventDefault();
    setPetFormError(null);

    const manufacturer = petFormData.manufacturer.trim();
    const productName = petFormData.productName.trim();
    const quantity = parseNumber(petFormData.quantity);
    const weight = parseNumber(petFormData.weight);
    const minQty = parseNumber(petFormData.minQty);
    const maxQty = parseNumber(petFormData.maxQty);

    if (!manufacturer) {
      setPetFormError(t("inventory.pet.form.errors.manufacturerRequired") as string);
      return;
    }
    if (!productName) {
      setPetFormError(t("inventory.pet.form.errors.productRequired") as string);
      return;
    }
    if (quantity == null) {
      setPetFormError(t("inventory.pet.form.errors.quantityRequired") as string);
      return;
    }
    if (minQty != null && maxQty != null && minQty > maxQty) {
      setPetFormError(t("inventory.pet.form.errors.minMax") as string);
      return;
    }

    const payload = {
      manufacturer,
      productName,
      foodType: petFormData.foodType.trim() || null,
      packageType: petFormData.packageType.trim() || null,
      weight,
      weightUnit: petFormData.weightUnit.trim() || null,
      quantity,
      minQty,
      maxQty,
      expiresAt: petFormData.expiresAt ? new Date(petFormData.expiresAt).toISOString() : null,
      notes: petFormData.notes.trim() || null,
    };

    try {
      setPetFormSubmitting(true);
      if (petFormMode === "create") {
        const created = await inventoryApi.createPetItem(payload);
        setPetItems((prev) => [created, ...prev]);
      } else if (petEditingId) {
        const updated = await inventoryApi.updatePetItem(petEditingId, payload);
        setPetItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      }
      setPetFormOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setPetFormError(t("inventory.pet.form.errors.submit", { message }) as string);
    } finally {
      setPetFormSubmitting(false);
    }
  }

  async function deletePetItem(item: PetFoodItem) {
    if (!window.confirm(t("inventory.pet.form.deleteConfirm") as string)) return;
    try {
      await inventoryApi.deletePetItem(item.id);
      setPetItems((prev) => prev.filter((entry) => entry.id !== item.id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setPetError(t("inventory.pet.form.errors.delete", { message }) as string);
    }
  }

  async function submitPetConsume(event: React.FormEvent) {
    event.preventDefault();
    setPetConsumeError(null);
    const amount = parseNumber(petConsumeForm.amount);
    if (amount == null || amount <= 0) {
      setPetConsumeError(t("inventory.pet.consume.errors.amountRequired") as string);
      return;
    }
    if (!petConsumeForm.itemId) {
      setPetConsumeError(t("inventory.pet.consume.errors.unknownItem") as string);
      return;
    }
    try {
      setPetConsumeSubmitting(true);
      const updated = await inventoryApi.consumePetItem(petConsumeForm.itemId, { amount });
      setPetItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setPetConsumeOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setPetConsumeError(t("inventory.pet.consume.errors.submit", { message }) as string);
    } finally {
      setPetConsumeSubmitting(false);
    }
  }
  async function deleteItem(item: InventoryItem) {
    if (!window.confirm(t("inventory.form.deleteConfirm") as string)) return;
    try {
      await inventoryApi.deleteItem(item.id);
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(t("inventory.form.errors.delete", { message }) as string);
    }
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
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
                <div className="text-xs text-gray-500">
                  {t("inventory.table.count", { count: filteredItems.length })}
                </div>
                <button
                  type="button"
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600"
                  onClick={openCreate}
                >
                  {t("inventory.form.addButton")}
                </button>
              </div>
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
                        <th className="px-3 py-2 text-right">{t("inventory.table.columns.actions")}</th>
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
                            <td className="px-3 py-2 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  className="text-xs font-medium text-sky-600 hover:text-sky-700"
                                  onClick={() => openConsume(item)}
                                >
                                  {t("inventory.consume.button")}
                                </button>
                                <button
                                  type="button"
                                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                                  onClick={() => openEdit(item)}
                                >
                                  {t("inventory.form.editButton")}
                                </button>
                                <button
                                  type="button"
                                  className="text-xs font-medium text-red-600 hover:text-red-700"
                                  onClick={() => deleteItem(item)}
                                >
                                  {t("inventory.form.deleteButton")}
                                </button>
                              </div>
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
            <div className="mt-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
                <div className="text-xs text-gray-500">
                  {t("inventory.pet.table.count", { count: petItems.length })}
                </div>
                <button
                  type="button"
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600"
                  onClick={() => openPetForm("create")}
                >
                  {t("inventory.pet.form.addButton")}
                </button>
              </div>
              {petLoading && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  {t("inventory.pet.table.loading")}
                </div>
              )}
              {petError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {t("inventory.pet.table.error", { message: petError })}
                </div>
              )}
              {!petLoading && !petError && petItems.length === 0 && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  {t("inventory.pet.table.empty")}
                </div>
              )}
              {!petLoading && !petError && petItems.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-3 py-2">{t("inventory.pet.table.columns.product")}</th>
                        <th className="px-3 py-2">{t("inventory.pet.table.columns.quantity")}</th>
                        <th className="px-3 py-2">{t("inventory.pet.table.columns.expiry")}</th>
                        <th className="px-3 py-2">{t("inventory.pet.table.columns.status")}</th>
                        <th className="px-3 py-2">{t("inventory.pet.table.columns.toBuy")}</th>
                        <th className="px-3 py-2 text-right">{t("inventory.pet.table.columns.actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {petItems.map((item) => {
                        const expiry = getExpiryStatus(item.expiresAt);
                        const restock = getRestockStatus(item.quantity, item.minQty);
                        const toBuy = getToBuy(item.quantity, item.minQty, item.maxQty);
                        const title = `${item.manufacturer} ${item.productName}`.trim();
                        const meta = [item.foodType, item.packageType, item.weight]
                          .filter(Boolean)
                          .join(" · ");
                        return (
                          <tr key={item.id} className="bg-white">
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900">{title}</div>
                              <div className="text-xs text-gray-500">{meta || "—"}</div>
                            </td>
                            <td className="px-3 py-2">
                              {item.quantity}
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
                              {toBuy > 0 ? `${toBuy}` : "—"}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  className="text-xs font-medium text-sky-600 hover:text-sky-700"
                                  onClick={() => openPetConsume(item)}
                                >
                                  {t("inventory.pet.consume.button")}
                                </button>
                                <button
                                  type="button"
                                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                                  onClick={() => openPetForm("edit", item)}
                                >
                                  {t("inventory.pet.form.editButton")}
                                </button>
                                <button
                                  type="button"
                                  className="text-xs font-medium text-red-600 hover:text-red-700"
                                  onClick={() => deletePetItem(item)}
                                >
                                  {t("inventory.pet.form.deleteButton")}
                                </button>
                              </div>
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
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="text-sm font-semibold text-gray-800">{t("inventory.events.title")}</div>
        <p className="mt-1 text-sm text-gray-500">{t("inventory.events.subtitle")}</p>
        <div className="mt-4">
          {upcomingEvents.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-500">
              {t("inventory.events.empty")}
            </div>
          )}
          {upcomingEvents.length > 0 && (
            <div className="space-y-2">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium text-gray-800">{event.label}</div>
                    <div className="text-xs text-gray-500">
                      {event.kind === "expiry"
                        ? t("inventory.events.expiryLabel")
                        : t("inventory.events.restockLabel")}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {event.date.toLocaleDateString(locale)}
                  </div>
                </div>
              ))}
            </div>
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
      {formOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {formMode === "create"
                    ? t("inventory.form.createTitle")
                    : t("inventory.form.editTitle")}
                </h2>
                <p className="text-sm text-gray-500">{t("inventory.form.subtitle")}</p>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={closeForm}
                aria-label={t("inventory.form.close") as string}
              >
                ✕
              </button>
            </div>
            <form className="mt-4 space-y-4" onSubmit={submitForm}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-gray-600">{t("inventory.form.fields.name")}</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={formData.name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">{t("inventory.form.fields.baseName")}</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={formData.baseName}
                    onChange={(event) => setFormData((prev) => ({ ...prev, baseName: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">{t("inventory.form.fields.category")}</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={formData.category}
                    onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">{t("inventory.form.fields.location")}</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={formData.location}
                    onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">{t("inventory.form.fields.quantity")}</label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={formData.quantity}
                    onChange={(event) => setFormData((prev) => ({ ...prev, quantity: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">{t("inventory.form.fields.unit")}</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={formData.unit}
                    onChange={(event) => setFormData((prev) => ({ ...prev, unit: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">{t("inventory.form.fields.minQty")}</label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={formData.minQty}
                    onChange={(event) => setFormData((prev) => ({ ...prev, minQty: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">{t("inventory.form.fields.maxQty")}</label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={formData.maxQty}
                    onChange={(event) => setFormData((prev) => ({ ...prev, maxQty: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">{t("inventory.form.fields.expiresAt")}</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={formData.expiresAt}
                    onChange={(event) => setFormData((prev) => ({ ...prev, expiresAt: event.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600">{t("inventory.form.fields.notes")}</label>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    rows={3}
                    value={formData.notes}
                    onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                </div>
              </div>
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  onClick={closeForm}
                >
                  {t("inventory.form.cancelButton")}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-70"
                  disabled={formSubmitting}
                >
                  {formSubmitting
                    ? t("inventory.form.saving")
                    : formMode === "create"
                      ? t("inventory.form.saveButton")
                      : t("inventory.form.updateButton")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {consumeOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {t("inventory.consume.title")}
                </h2>
                <p className="text-sm text-gray-500">{t("inventory.consume.subtitle")}</p>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={closeConsume}
                aria-label={t("inventory.consume.close") as string}
              >
                ✕
              </button>
            </div>
            <form className="mt-4 space-y-4" onSubmit={submitConsume}>
              <div>
                <label className="text-sm text-gray-600">{t("inventory.consume.amount")}</label>
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={consumeForm.amount}
                  onChange={(event) =>
                    setConsumeForm((prev) => ({ ...prev, amount: event.target.value }))
                  }
                />
              </div>
              {consumeError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {consumeError}
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  onClick={closeConsume}
                >
                  {t("inventory.consume.cancel")}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-70"
                  disabled={consumeSubmitting}
                >
                  {consumeSubmitting
                    ? t("inventory.consume.saving")
                    : t("inventory.consume.confirm")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {petFormOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {petFormMode === "create"
                    ? t("inventory.pet.form.createTitle")
                    : t("inventory.pet.form.editTitle")}
                </h2>
                <p className="text-sm text-gray-500">{t("inventory.pet.form.subtitle")}</p>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={closePetForm}
                aria-label={t("inventory.pet.form.close") as string}
              >
                ✕
              </button>
            </div>
            <form className="mt-4 space-y-4" onSubmit={submitPetForm}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-gray-600">
                    {t("inventory.pet.form.fields.manufacturer")}
                  </label>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={petFormData.manufacturer}
                    onChange={(event) =>
                      setPetFormData((prev) => ({ ...prev, manufacturer: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">
                    {t("inventory.pet.form.fields.productName")}
                  </label>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={petFormData.productName}
                    onChange={(event) =>
                      setPetFormData((prev) => ({ ...prev, productName: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">
                    {t("inventory.pet.form.fields.foodType")}
                  </label>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={petFormData.foodType}
                    onChange={(event) =>
                      setPetFormData((prev) => ({ ...prev, foodType: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">
                    {t("inventory.pet.form.fields.packageType")}
                  </label>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={petFormData.packageType}
                    onChange={(event) =>
                      setPetFormData((prev) => ({ ...prev, packageType: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">
                    {t("inventory.pet.form.fields.weight")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={petFormData.weight}
                    onChange={(event) =>
                      setPetFormData((prev) => ({ ...prev, weight: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">
                    {t("inventory.pet.form.fields.weightUnit")}
                  </label>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={petFormData.weightUnit}
                    onChange={(event) =>
                      setPetFormData((prev) => ({ ...prev, weightUnit: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">
                    {t("inventory.pet.form.fields.quantity")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={petFormData.quantity}
                    onChange={(event) =>
                      setPetFormData((prev) => ({ ...prev, quantity: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">
                    {t("inventory.pet.form.fields.minQty")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={petFormData.minQty}
                    onChange={(event) =>
                      setPetFormData((prev) => ({ ...prev, minQty: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">
                    {t("inventory.pet.form.fields.maxQty")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={petFormData.maxQty}
                    onChange={(event) =>
                      setPetFormData((prev) => ({ ...prev, maxQty: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">
                    {t("inventory.pet.form.fields.expiresAt")}
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={petFormData.expiresAt}
                    onChange={(event) =>
                      setPetFormData((prev) => ({ ...prev, expiresAt: event.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600">
                    {t("inventory.pet.form.fields.notes")}
                  </label>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    rows={3}
                    value={petFormData.notes}
                    onChange={(event) =>
                      setPetFormData((prev) => ({ ...prev, notes: event.target.value }))
                    }
                  />
                </div>
              </div>
              {petFormError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {petFormError}
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  onClick={closePetForm}
                >
                  {t("inventory.pet.form.cancelButton")}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-70"
                  disabled={petFormSubmitting}
                >
                  {petFormSubmitting
                    ? t("inventory.pet.form.saving")
                    : petFormMode === "create"
                      ? t("inventory.pet.form.saveButton")
                      : t("inventory.pet.form.updateButton")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {petConsumeOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {t("inventory.pet.consume.title")}
                </h2>
                <p className="text-sm text-gray-500">{t("inventory.pet.consume.subtitle")}</p>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={closePetConsume}
                aria-label={t("inventory.pet.consume.close") as string}
              >
                ✕
              </button>
            </div>
            <form className="mt-4 space-y-4" onSubmit={submitPetConsume}>
              <div>
                <label className="text-sm text-gray-600">
                  {t("inventory.pet.consume.amount")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={petConsumeForm.amount}
                  onChange={(event) =>
                    setPetConsumeForm((prev) => ({ ...prev, amount: event.target.value }))
                  }
                />
              </div>
              {petConsumeError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {petConsumeError}
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  onClick={closePetConsume}
                >
                  {t("inventory.pet.consume.cancel")}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-70"
                  disabled={petConsumeSubmitting}
                >
                  {petConsumeSubmitting
                    ? t("inventory.pet.consume.saving")
                    : t("inventory.pet.consume.confirm")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
