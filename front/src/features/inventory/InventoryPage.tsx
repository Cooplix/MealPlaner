import { useCallback, useEffect, useId, useMemo, useState } from "react";
import AutocompleteInput from "../../components/AutocompleteInput";
import { DataTableToolbar } from "../../components/DataTableToolbar";
import { EmptyState } from "../../components/EmptyState";
import { InlineAlert } from "../../components/InlineAlert";
import { InfoCard } from "../../components/InfoCard";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { useDialog } from "../../hooks/useDialog";
import { useTranslation } from "../../i18n";
import type { IngredientOption } from "../../types";
import { findIngredientOption, getIngredientOptionLabel } from "../../utils/ingredientNames";
import { inventoryApi } from "./api";
import { getExpiryStatus, getRestockStatus, getToBuy } from "./inventoryStatus";
import type { InventoryEvent, InventoryFilters, InventoryItem, PetFoodItem } from "./types";

type InventoryTab = "products" | "catFood";
type InventoryFormMode = "create" | "edit";
type StatusTone = "success" | "info" | "warn" | "error" | "neutral";
type InventorySummary = {
  total: number;
  expired: number;
  expiringSoon: number;
  restock: number;
  toBuy: number;
};

type InventoryFormState = {
  ingredientKey: string;
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
  ingredientKey: "",
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

const DEFAULT_VISIBLE_PRODUCTS = 10;

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

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

function eventTone(event: InventoryEvent): string {
  switch (event.priority) {
    case "critical":
      return "border-[color:var(--ui-error-border)] bg-[color:var(--ui-error-bg)]";
    case "high":
      return "border-[color:var(--ui-warn-border)] bg-[color:var(--ui-warn-bg)]";
    case "medium":
      return "border-[color:var(--ui-info-border)] bg-[color:var(--ui-info-bg)]";
    default:
      return "border-[color:var(--ui-border)] bg-[color:var(--ui-neutral-bg)]";
  }
}

function expiryTone(status: string): StatusTone {
  switch (status) {
    case "EXPIRED":
      return "error";
    case "<=14d":
      return "warn";
    case "<=30d":
      return "info";
    default:
      return "success";
  }
}

function restockTone(status: string): StatusTone {
  return status === "RESTOCK" ? "warn" : "success";
}

type InventoryPageProps = {
  ingredientOptions: IngredientOption[];
  categories: string[];
  locations: string[];
  units: string[];
};

export function InventoryPage({ ingredientOptions, categories, locations, units }: InventoryPageProps) {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<InventoryTab>("products");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [petItems, setPetItems] = useState<PetFoodItem[]>([]);
  const [petLoading, setPetLoading] = useState(false);
  const [petError, setPetError] = useState<string | null>(null);
  const [events, setEvents] = useState<InventoryEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
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

  const productFormTitleId = useId();
  const productFormSubtitleId = useId();
  const consumeTitleId = useId();
  const consumeSubtitleId = useId();
  const petFormTitleId = useId();
  const petFormSubtitleId = useId();
  const petConsumeTitleId = useId();
  const petConsumeSubtitleId = useId();

  const productFormDialogRef = useDialog(formOpen, closeForm);
  const consumeDialogRef = useDialog(consumeOpen, closeConsume);
  const petFormDialogRef = useDialog(petFormOpen, closePetForm);
  const petConsumeDialogRef = useDialog(petConsumeOpen, closePetConsume);
  const [sortMode, setSortMode] = useState("nameAsc");
  const [petSortMode, setPetSortMode] = useState("nameAsc");
  const [visibleProductsCount, setVisibleProductsCount] = useState(DEFAULT_VISIBLE_PRODUCTS);
  const hints = useMemo(() => {
    return [
      t("inventory.hints.products"),
      t("inventory.hints.catFood"),
      t("inventory.hints.status"),
    ];
  }, [t]);
  const locale = language === "uk" ? "uk-UA" : language === "pl" ? "pl-PL" : "en-US";
  const collator = useMemo(
    () => new Intl.Collator(locale, { sensitivity: "base" }),
    [locale],
  );
  const sortedUnits = useMemo(
    () => [...units].sort((a, b) => collator.compare(a, b)),
    [units, collator],
  );
  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => collator.compare(a, b)),
    [locations, collator],
  );
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => collator.compare(a, b)),
    [categories, collator],
  );
  const defaultUnit = sortedUnits[0] ?? "";
  const defaultLocation = sortedLocations[0] ?? "";
  const quantityFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    [locale],
  );
  const priceFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [locale],
  );

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const data = await inventoryApi.listEvents();
      setEvents(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err ?? t("common.unknownError"));
      setEventsError(message);
    } finally {
      setEventsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

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

  const formatUnit = useCallback(
    (value: string): string => {
      const label = t(`units.${value}`);
      return label.startsWith("units.") ? value : label;
    },
    [t],
  );

  const categoryOptions = useMemo(() => {
    const unique = new Set<string>(sortedCategories);
    items.forEach((item) => {
      if (item.category) unique.add(item.category);
    });
    return Array.from(unique).sort((a, b) => collator.compare(formatUnit(a), formatUnit(b)));
  }, [sortedCategories, items, collator, formatUnit]);

  const locationOptions = useMemo(() => {
    const unique = new Set<string>(sortedLocations);
    items.forEach((item) => {
      if (item.location) unique.add(item.location);
    });
    return Array.from(unique).sort((a, b) => collator.compare(formatUnit(a), formatUnit(b)));
  }, [sortedLocations, items, collator, formatUnit]);

  const unitOptions = useMemo(() => {
    const unique = new Set<string>(sortedUnits);
    items.forEach((item) => {
      if (item.unit) unique.add(item.unit);
    });
    return Array.from(unique).sort((a, b) => collator.compare(a, b));
  }, [sortedUnits, items, collator]);

  const petUnitOptions = useMemo(() => {
    const unique = new Set<string>(sortedUnits);
    petItems.forEach((item) => {
      if (item.weightUnit) unique.add(item.weightUnit);
    });
    return Array.from(unique).sort((a, b) => collator.compare(a, b));
  }, [sortedUnits, petItems, collator]);

  useEffect(() => {
    if (!formOpen || formMode !== "create") return;
    setFormData((prev) => ({
      ...prev,
      unit: prev.unit || defaultUnit,
      location: prev.location || defaultLocation,
    }));
  }, [formOpen, formMode, defaultUnit, defaultLocation]);

  const formCategoryOptions = formMode === "edit" ? categoryOptions : sortedCategories;
  const formLocationOptions = formMode === "edit" ? locationOptions : sortedLocations;
  const formUnitOptions = formMode === "edit" ? unitOptions : sortedUnits;

  const filteredItems = useMemo(() => {
    const list = items.filter((item) => {
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

    const compareExpiry = (left: InventoryItem, right: InventoryItem, direction: number) => {
      const leftDate = left.expiresAt ? new Date(left.expiresAt).getTime() : null;
      const rightDate = right.expiresAt ? new Date(right.expiresAt).getTime() : null;
      if (leftDate === null && rightDate === null) return 0;
      if (leftDate === null) return 1;
      if (rightDate === null) return -1;
      return (leftDate - rightDate) * direction;
    };

    list.sort((left, right) => {
      const leftName = left.name ?? "";
      const rightName = right.name ?? "";
      const leftCategory = left.category?.trim() ?? "";
      const rightCategory = right.category?.trim() ?? "";
      const leftToBuy = getToBuy(left.quantity, left.minQty, left.maxQty);
      const rightToBuy = getToBuy(right.quantity, right.minQty, right.maxQty);

      switch (sortMode) {
        case "nameDesc":
          return collator.compare(rightName, leftName);
        case "categoryAsc": {
          const byCategory = collator.compare(leftCategory, rightCategory);
          if (byCategory !== 0) return byCategory;
          return collator.compare(leftName, rightName);
        }
        case "categoryDesc": {
          const byCategory = collator.compare(rightCategory, leftCategory);
          if (byCategory !== 0) return byCategory;
          return collator.compare(rightName, leftName);
        }
        case "quantityDesc":
          return right.quantity - left.quantity;
        case "quantityAsc":
          return left.quantity - right.quantity;
        case "expiryAsc":
          return compareExpiry(left, right, 1);
        case "expiryDesc":
          return compareExpiry(left, right, -1);
        case "toBuyDesc":
          return rightToBuy - leftToBuy;
        case "toBuyAsc":
          return leftToBuy - rightToBuy;
        case "nameAsc":
        default:
          return collator.compare(leftName, rightName);
      }
    });
    return list;
  }, [items, filters, sortMode, collator]);

  const productsSummary = useMemo<InventorySummary>(() => {
    const expired = items.reduce((count, item) => count + (getExpiryStatus(item.expiresAt) === "EXPIRED" ? 1 : 0), 0);
    const expiringSoon = items.reduce((count, item) => {
      const expiry = getExpiryStatus(item.expiresAt);
      return count + (expiry === "<=14d" || expiry === "<=30d" ? 1 : 0);
    }, 0);
    const restock = items.reduce((count, item) => count + (getRestockStatus(item.quantity, item.minQty) === "RESTOCK" ? 1 : 0), 0);
    const toBuy = items.reduce((count, item) => count + (getToBuy(item.quantity, item.minQty, item.maxQty) > 0 ? 1 : 0), 0);

    return { total: items.length, expired, expiringSoon, restock, toBuy };
  }, [items]);

  const petSummary = useMemo<InventorySummary>(() => {
    const expired = petItems.reduce(
      (count, item) => count + (getExpiryStatus(item.expiresAt) === "EXPIRED" ? 1 : 0),
      0,
    );
    const expiringSoon = petItems.reduce((count, item) => {
      const expiry = getExpiryStatus(item.expiresAt);
      return count + (expiry === "<=14d" || expiry === "<=30d" ? 1 : 0);
    }, 0);
    const restock = petItems.reduce(
      (count, item) => count + (getRestockStatus(item.quantity, item.minQty) === "RESTOCK" ? 1 : 0),
      0,
    );
    const toBuy = petItems.reduce(
      (count, item) => count + (getToBuy(item.quantity, item.minQty, item.maxQty) > 0 ? 1 : 0),
      0,
    );

    return { total: petItems.length, expired, expiringSoon, restock, toBuy };
  }, [petItems]);

  const activeSummary = activeTab === "products" ? productsSummary : petSummary;

  const sortOptions = useMemo(
    () => [
      { value: "nameAsc", label: t("inventory.sort.options.nameAsc") as string },
      { value: "nameDesc", label: t("inventory.sort.options.nameDesc") as string },
      { value: "categoryAsc", label: t("inventory.sort.options.categoryAsc") as string },
      { value: "categoryDesc", label: t("inventory.sort.options.categoryDesc") as string },
      { value: "quantityDesc", label: t("inventory.sort.options.quantityDesc") as string },
      { value: "quantityAsc", label: t("inventory.sort.options.quantityAsc") as string },
      { value: "expiryAsc", label: t("inventory.sort.options.expiryAsc") as string },
      { value: "expiryDesc", label: t("inventory.sort.options.expiryDesc") as string },
      { value: "toBuyDesc", label: t("inventory.sort.options.toBuyDesc") as string },
      { value: "toBuyAsc", label: t("inventory.sort.options.toBuyAsc") as string },
    ],
    [t],
  );

  const petSortOptions = useMemo(
    () => [
      { value: "nameAsc", label: t("inventory.pet.sort.options.nameAsc") as string },
      { value: "nameDesc", label: t("inventory.pet.sort.options.nameDesc") as string },
      { value: "quantityDesc", label: t("inventory.pet.sort.options.quantityDesc") as string },
      { value: "quantityAsc", label: t("inventory.pet.sort.options.quantityAsc") as string },
      { value: "expiryAsc", label: t("inventory.pet.sort.options.expiryAsc") as string },
      { value: "expiryDesc", label: t("inventory.pet.sort.options.expiryDesc") as string },
      { value: "toBuyDesc", label: t("inventory.pet.sort.options.toBuyDesc") as string },
      { value: "toBuyAsc", label: t("inventory.pet.sort.options.toBuyAsc") as string },
    ],
    [t],
  );

  const sortedPetItems = useMemo(() => {
    const list = petItems.slice();
    const compareExpiry = (left: PetFoodItem, right: PetFoodItem, direction: number) => {
      const leftDate = left.expiresAt ? new Date(left.expiresAt).getTime() : null;
      const rightDate = right.expiresAt ? new Date(right.expiresAt).getTime() : null;
      if (leftDate === null && rightDate === null) return 0;
      if (leftDate === null) return 1;
      if (rightDate === null) return -1;
      return (leftDate - rightDate) * direction;
    };
    list.sort((left, right) => {
      const leftTitle = `${left.manufacturer} ${left.productName}`.trim();
      const rightTitle = `${right.manufacturer} ${right.productName}`.trim();
      const leftToBuy = getToBuy(left.quantity, left.minQty, left.maxQty);
      const rightToBuy = getToBuy(right.quantity, right.minQty, right.maxQty);

      switch (petSortMode) {
        case "nameDesc":
          return collator.compare(rightTitle, leftTitle);
        case "quantityDesc":
          return right.quantity - left.quantity;
        case "quantityAsc":
          return left.quantity - right.quantity;
        case "expiryAsc":
          return compareExpiry(left, right, 1);
        case "expiryDesc":
          return compareExpiry(left, right, -1);
        case "toBuyDesc":
          return rightToBuy - leftToBuy;
        case "toBuyAsc":
          return leftToBuy - rightToBuy;
        case "nameAsc":
        default:
          return collator.compare(leftTitle, rightTitle);
      }
    });
    return list;
  }, [petItems, petSortMode, collator]);

  const visibleFilteredItems = useMemo(
    () => filteredItems.slice(0, visibleProductsCount),
    [filteredItems, visibleProductsCount],
  );

  useEffect(() => {
    setVisibleProductsCount(DEFAULT_VISIBLE_PRODUCTS);
  }, [activeTab, filters.search, filters.category, filters.location, filters.status, sortMode]);

  const ingredientOptionMap = useMemo(() => {
    const map = new Map<string, IngredientOption>();
    ingredientOptions.forEach((option) => map.set(normalizeKey(option.key), option));
    return map;
  }, [ingredientOptions]);

  const eventKindLabel = (event: InventoryEvent): string => {
    switch (event.kind) {
      case "expiry":
        return t("inventory.events.expiryLabel") as string;
      case "restock":
        return t("inventory.events.restockLabel") as string;
      case "critical":
        return t("inventory.events.criticalLabel") as string;
      case "purchase":
        return t("inventory.events.purchaseLabel") as string;
      default:
        return t("inventory.events.restockLabel") as string;
    }
  };

  const formatEventDetail = (event: InventoryEvent): string | null => {
    if ((event.kind === "restock" || event.kind === "critical") && event.amount != null && event.unit) {
      const amountLabel = `${quantityFormatter.format(event.amount)} ${formatUnit(event.unit)}`;
      return event.kind === "restock"
        ? (t("inventory.events.restockDetail", { amount: amountLabel }) as string)
        : (t("inventory.events.criticalDetail", { amount: amountLabel }) as string);
    }
    if (event.kind === "purchase" && event.price != null) {
      const priceLabel = priceFormatter.format(event.price);
      if (event.amount != null && event.unit) {
        const amountLabel = `${quantityFormatter.format(event.amount)} ${formatUnit(event.unit)}`;
        return t("inventory.events.purchaseDetail", { price: priceLabel, amount: amountLabel }) as string;
      }
      return priceLabel;
    }
    return null;
  };

  function updateFilter<K extends keyof InventoryFilters>(key: K, value: InventoryFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setFormData({
      ...EMPTY_FORM,
      unit: defaultUnit,
      location: defaultLocation,
    });
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(item: InventoryItem) {
    const resolvedKey = item.ingredientKey
      ? normalizeKey(item.ingredientKey)
      : findIngredientOption(ingredientOptions, item.name, item.unit)?.key || "";
    setFormMode("edit");
    setEditingId(item.id);
    setFormData({
      ingredientKey: resolvedKey,
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

  function handleNameChange(value: string) {
    const match = findIngredientOption(ingredientOptions, value);
    if (match) {
      setFormData((prev) => ({
        ...prev,
        name: match.name,
        unit: match.unit,
        ingredientKey: match.key,
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, name: value, ingredientKey: "" }));
  }

  function handleUnitChange(value: string) {
    setFormData((prev) => {
      const next = { ...prev, unit: value };
      if (next.ingredientKey) {
        const option = ingredientOptionMap.get(normalizeKey(next.ingredientKey));
        if (option && option.unit !== value) {
          next.ingredientKey = "";
        }
      }
      if (!next.ingredientKey && next.name.trim()) {
        const match = findIngredientOption(ingredientOptions, next.name, value);
        if (match) {
          next.ingredientKey = match.key;
          next.name = match.name;
        }
      }
      return next;
    });
  }

  function suggestionList(value: string): IngredientOption[] {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return ingredientOptions.slice(0, 8);
    }
    return ingredientOptions
      .filter((option) => {
        const base = option.name.toLowerCase();
        if (base.includes(normalized)) return true;
        return Object.values(option.translations ?? {}).some(
          (translation) => translation.toLowerCase().includes(normalized),
        );
      })
      .slice(0, 8);
  }

  function buildIngredientSuggestions(value: string) {
    return suggestionList(value).map((option) => ({
      key: option.key,
      value: getIngredientOptionLabel(option, language),
      label: getIngredientOptionLabel(option, language),
      meta: option.unit,
    }));
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

    const resolvedIngredientKey =
      (formData.ingredientKey.trim() ? normalizeKey(formData.ingredientKey) : "") ||
      findIngredientOption(ingredientOptions, name, unit)?.key ||
      null;

    const payload = {
      ingredientKey: resolvedIngredientKey,
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
        void loadEvents();
      } else if (editingId) {
        const updated = await inventoryApi.updateItem(editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        void loadEvents();
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
      void loadEvents();
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
        void loadEvents();
      } else if (petEditingId) {
        const updated = await inventoryApi.updatePetItem(petEditingId, payload);
        setPetItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        void loadEvents();
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
      void loadEvents();
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
      void loadEvents();
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
      void loadEvents();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(t("inventory.form.errors.delete", { message }) as string);
    }
  }

  return (
    <section className="space-y-6">
      <SectionHeader
        title={t("inventory.title") as string}
        subtitle={t("inventory.subtitle") as string}
        titleAs="h1"
      />
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
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <InfoCard label={t("inventory.summaryCards.total") as string} value={`${activeSummary.total}`} />
        <InfoCard
          label={t("inventory.filters.expired") as string}
          value={`${activeSummary.expired}`}
          tone={activeSummary.expired > 0 ? "error" : "neutral"}
        />
        <InfoCard
          label={t("inventory.filters.soon") as string}
          value={`${activeSummary.expiringSoon}`}
          tone={activeSummary.expiringSoon > 0 ? "warn" : "neutral"}
        />
        <InfoCard
          label={t("inventory.filters.restock") as string}
          value={`${activeSummary.restock}`}
          tone={activeSummary.restock > 0 ? "warn" : "neutral"}
        />
        <InfoCard
          label={t("inventory.table.columns.toBuy") as string}
          value={`${activeSummary.toBuy}`}
          tone={activeSummary.toBuy > 0 ? "info" : "neutral"}
        />
      </div>
      <div className="rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-6 shadow-sm space-y-4">
        {activeTab === "products" ? (
          <>
            <DataTableToolbar
              title={t("inventory.table.productsTitle") as string}
              titleAs="h2"
              meta={t("inventory.table.count", { count: filteredItems.length }) as string}
              controls={
                <>
                  <div className="w-full sm:w-64">
                    <label className="block text-xs font-medium text-gray-500" htmlFor="inventory-filter-search">
                      {t("inventory.filters.search")}
                    </label>
                    <input
                      id="inventory-filter-search"
                      type="text"
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                      placeholder={t("inventory.filters.searchPlaceholder") as string}
                      value={filters.search}
                      onChange={(event) => updateFilter("search", event.target.value)}
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <label className="block text-xs font-medium text-gray-500" htmlFor="inventory-filter-category">
                      {t("inventory.filters.category")}
                    </label>
                    <select
                      id="inventory-filter-category"
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                      value={filters.category}
                      onChange={(event) => updateFilter("category", event.target.value)}
                    >
                      <option value="all">{t("inventory.filters.all")}</option>
                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:w-48">
                    <label className="block text-xs font-medium text-gray-500" htmlFor="inventory-filter-location">
                      {t("inventory.filters.location")}
                    </label>
                    <select
                      id="inventory-filter-location"
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                      value={filters.location}
                      onChange={(event) => updateFilter("location", event.target.value)}
                    >
                      <option value="all">{t("inventory.filters.all")}</option>
                      {locationOptions.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:w-48">
                    <label className="block text-xs font-medium text-gray-500" htmlFor="inventory-filter-status">
                      {t("inventory.filters.status")}
                    </label>
                    <select
                      id="inventory-filter-status"
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                      value={filters.status}
                      onChange={(event) => updateFilter("status", event.target.value as InventoryFilters["status"])}
                    >
                      <option value="all">{t("inventory.filters.all")}</option>
                      <option value="expired">{t("inventory.filters.expired")}</option>
                      <option value="soon">{t("inventory.filters.soon")}</option>
                      <option value="restock">{t("inventory.filters.restock")}</option>
                    </select>
                  </div>
                  <div className="w-full sm:w-48">
                    <label className="block text-xs font-medium text-gray-500" htmlFor="inventory-sort">
                      {t("inventory.sort.label")}
                    </label>
                    <select
                      id="inventory-sort"
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
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
                    className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                    onClick={openCreate}
                  >
                    {t("inventory.form.addButton")}
                  </button>
                </>
              }
            />

            {loading && <InlineAlert tone="info" message={t("inventory.table.loading") as string} />}
            {error && (
              <InlineAlert tone="error" message={t("inventory.table.error", { message: error }) as string} />
            )}
            {!loading && !error && filteredItems.length === 0 && <EmptyState title={t("inventory.table.empty") as string} />}
            {!loading && !error && filteredItems.length > 0 && (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-[color:var(--ui-border)]">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-[color:var(--ui-surface-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-muted)]">
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
                        {visibleFilteredItems.map((item) => {
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
                                {item.quantity} {formatUnit(item.unit)}
                              </td>
                              <td className="px-3 py-2">
                                {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : "—"}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-col gap-1">
                                  <StatusBadge tone={expiryTone(expiry)}>
                                    {t(`inventory.status.expiry.${expiry}`)}
                                  </StatusBadge>
                                  <StatusBadge tone={restockTone(restock)}>
                                    {t(`inventory.status.restock.${restock}`)}
                                  </StatusBadge>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                {toBuy > 0 ? `${toBuy} ${formatUnit(item.unit)}` : "—"}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    className="text-xs font-medium text-[color:var(--ui-info-text)] hover:opacity-80"
                                    onClick={() => openConsume(item)}
                                  >
                                    {t("inventory.consume.button")}
                                  </button>
                                  <button
                                    type="button"
                                    className="text-xs font-medium text-[color:var(--ui-success-text)] hover:opacity-80"
                                    onClick={() => openEdit(item)}
                                  >
                                    {t("inventory.form.editButton")}
                                  </button>
                                  <button
                                    type="button"
                                    className="text-xs font-medium text-[color:var(--ui-error-text)] hover:opacity-80"
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
                </div>
                {visibleProductsCount < filteredItems.length && (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      onClick={() =>
                        setVisibleProductsCount((prev) => Math.min(prev + DEFAULT_VISIBLE_PRODUCTS, filteredItems.length))
                      }
                    >
                      {t("inventory.table.showMore")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <DataTableToolbar
              title={t("inventory.table.catFoodTitle") as string}
              titleAs="h2"
              meta={t("inventory.pet.table.count", { count: petItems.length }) as string}
              controls={
                <>
                  <div className="w-full sm:w-48">
                    <label className="block text-xs font-medium text-gray-500" htmlFor="inventory-pet-sort">
                      {t("inventory.pet.sort.label")}
                    </label>
                    <select
                      id="inventory-pet-sort"
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                      value={petSortMode}
                      onChange={(event) => setPetSortMode(event.target.value)}
                    >
                      {petSortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                    onClick={() => openPetForm("create")}
                  >
                    {t("inventory.pet.form.addButton")}
                  </button>
                </>
              }
            />

            {petLoading && <InlineAlert tone="info" message={t("inventory.pet.table.loading") as string} />}
            {petError && (
              <InlineAlert tone="error" message={t("inventory.pet.table.error", { message: petError }) as string} />
            )}
            {!petLoading && !petError && petItems.length === 0 && (
              <EmptyState title={t("inventory.pet.table.empty") as string} />
            )}
            {!petLoading && !petError && petItems.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-[color:var(--ui-border)]">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[color:var(--ui-surface-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-muted)]">
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
                      {sortedPetItems.map((item) => {
                        const expiry = getExpiryStatus(item.expiresAt);
                        const restock = getRestockStatus(item.quantity, item.minQty);
                        const toBuy = getToBuy(item.quantity, item.minQty, item.maxQty);
                        const title = `${item.manufacturer} ${item.productName}`.trim();
                        const meta = [item.foodType, item.packageType, item.weight].filter(Boolean).join(" · ");
                        return (
                          <tr key={item.id} className="bg-white">
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900">{title}</div>
                              <div className="text-xs text-gray-500">{meta || "—"}</div>
                            </td>
                            <td className="px-3 py-2">{item.quantity}</td>
                            <td className="px-3 py-2">
                              {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : "—"}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-1">
                                <StatusBadge tone={expiryTone(expiry)}>
                                  {t(`inventory.status.expiry.${expiry}`)}
                                </StatusBadge>
                                <StatusBadge tone={restockTone(restock)}>
                                  {t(`inventory.status.restock.${restock}`)}
                                </StatusBadge>
                              </div>
                            </td>
                            <td className="px-3 py-2">{toBuy > 0 ? `${toBuy}` : "—"}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  className="text-xs font-medium text-[color:var(--ui-info-text)] hover:opacity-80"
                                  onClick={() => openPetConsume(item)}
                                >
                                  {t("inventory.pet.consume.button")}
                                </button>
                                <button
                                  type="button"
                                  className="text-xs font-medium text-[color:var(--ui-success-text)] hover:opacity-80"
                                  onClick={() => openPetForm("edit", item)}
                                >
                                  {t("inventory.pet.form.editButton")}
                                </button>
                                <button
                                  type="button"
                                  className="text-xs font-medium text-[color:var(--ui-error-text)] hover:opacity-80"
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
              </div>
            )}
          </>
        )}
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="text-sm font-semibold text-gray-800">{t("inventory.events.title")}</div>
        <p className="mt-1 text-sm text-gray-500">{t("inventory.events.subtitle")}</p>
        <div className="mt-4">
          {eventsError && (
            <InlineAlert
              tone="error"
              message={t("errors.loadEvents", { message: eventsError }) as string}
              className="mb-3"
            />
          )}
          {eventsLoading && (
            <InlineAlert tone="info" message={t("app.loading") as string} />
          )}
          {!eventsLoading && events.length === 0 && (
            <EmptyState title={t("inventory.events.empty") as string} />
          )}
          {events.length > 0 && (
            <div className="space-y-2">
              {events.map((event) => {
                const detail = formatEventDetail(event);
                const eventDate = event.date ? new Date(event.date) : null;
                return (
                  <div
                    key={event.id}
                    className={`flex items-start justify-between rounded-lg border px-3 py-2 text-sm ${eventTone(event)}`}
                  >
                    <div>
                      <div className="font-medium text-gray-800">{event.title}</div>
                      <div className="text-xs text-gray-500">{eventKindLabel(event)}</div>
                      {detail && <div className="text-xs text-gray-500">{detail}</div>}
                    </div>
                    <div className="text-xs text-gray-500">
                      {eventDate ? eventDate.toLocaleDateString(locale) : "—"}
                    </div>
                  </div>
                );
              })}
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
          <div
            ref={productFormDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`inventory-form-title-${productFormTitleId}`}
            aria-describedby={`inventory-form-subtitle-${productFormSubtitleId}`}
            tabIndex={-1}
            className="w-full max-w-2xl max-h-[90vh] rounded-lg bg-white shadow-xl flex flex-col"
          >
            <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
              <div>
                <h2
                  id={`inventory-form-title-${productFormTitleId}`}
                  className="text-lg font-semibold text-gray-900"
                >
                  {formMode === "create"
                    ? t("inventory.form.createTitle")
                    : t("inventory.form.editTitle")}
                </h2>
                <p
                  id={`inventory-form-subtitle-${productFormSubtitleId}`}
                  className="text-sm text-gray-500"
                >
                  {t("inventory.form.subtitle")}
                </p>
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
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={submitForm}>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-gray-600">{t("inventory.form.fields.name")}</label>
                    <AutocompleteInput
                      containerClassName="mt-1"
                      inputClassName="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      value={formData.name}
                      onChange={(value) => handleNameChange(value)}
                      options={buildIngredientSuggestions(formData.name)}
                      ariaLabel={t("inventory.form.fields.name") as string}
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
                    <select
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      value={formData.category}
                      onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
                    >
                      <option value="">{t("inventory.table.unknown")}</option>
                      {formCategoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">{t("inventory.form.fields.location")}</label>
                    <select
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      value={formData.location}
                      onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
                    >
                      <option value="">{t("inventory.table.unknown")}</option>
                      {formLocationOptions.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
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
                    <select
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      value={formData.unit}
                      onChange={(event) => handleUnitChange(event.target.value)}
                    >
                      <option value="">{t("inventory.table.unknown")}</option>
                      {formUnitOptions.map((unit) => (
                        <option key={unit} value={unit}>
                          {formatUnit(unit)}
                        </option>
                      ))}
                    </select>
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
                  <InlineAlert tone="error" message={formError} />
                )}
              </div>

              <div className="border-t px-6 py-4 flex flex-wrap justify-end gap-2 bg-white">
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
          <div
            ref={consumeDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`inventory-consume-title-${consumeTitleId}`}
            aria-describedby={`inventory-consume-subtitle-${consumeSubtitleId}`}
            tabIndex={-1}
            className="w-full max-w-md max-h-[90vh] rounded-lg bg-white shadow-xl flex flex-col"
          >
            <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
              <div>
                <h2
                  id={`inventory-consume-title-${consumeTitleId}`}
                  className="text-lg font-semibold text-gray-900"
                >
                  {t("inventory.consume.title")}
                </h2>
                <p
                  id={`inventory-consume-subtitle-${consumeSubtitleId}`}
                  className="text-sm text-gray-500"
                >
                  {t("inventory.consume.subtitle")}
                </p>
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

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={submitConsume}>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-4">
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
                {consumeError && <InlineAlert tone="error" message={consumeError} />}
              </div>

              <div className="border-t px-6 py-4 flex flex-wrap justify-end gap-2 bg-white">
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
                  {consumeSubmitting ? t("inventory.consume.saving") : t("inventory.consume.confirm")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {petFormOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div
            ref={petFormDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`inventory-pet-form-title-${petFormTitleId}`}
            aria-describedby={`inventory-pet-form-subtitle-${petFormSubtitleId}`}
            tabIndex={-1}
            className="w-full max-w-2xl max-h-[90vh] rounded-lg bg-white shadow-xl flex flex-col"
          >
            <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
              <div>
                <h2
                  id={`inventory-pet-form-title-${petFormTitleId}`}
                  className="text-lg font-semibold text-gray-900"
                >
                  {petFormMode === "create"
                    ? t("inventory.pet.form.createTitle")
                    : t("inventory.pet.form.editTitle")}
                </h2>
                <p
                  id={`inventory-pet-form-subtitle-${petFormSubtitleId}`}
                  className="text-sm text-gray-500"
                >
                  {t("inventory.pet.form.subtitle")}
                </p>
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
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={submitPetForm}>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-4">
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
                    <select
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      value={petFormData.weightUnit}
                      onChange={(event) =>
                        setPetFormData((prev) => ({ ...prev, weightUnit: event.target.value }))
                      }
                    >
                      <option value="">{t("inventory.table.unknown")}</option>
                      {petUnitOptions.map((unit) => (
                        <option key={unit} value={unit}>
                          {formatUnit(unit)}
                        </option>
                      ))}
                    </select>
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
                  <InlineAlert tone="error" message={petFormError} />
                )}
              </div>

              <div className="border-t px-6 py-4 flex flex-wrap justify-end gap-2 bg-white">
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
          <div
            ref={petConsumeDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`inventory-pet-consume-title-${petConsumeTitleId}`}
            aria-describedby={`inventory-pet-consume-subtitle-${petConsumeSubtitleId}`}
            tabIndex={-1}
            className="w-full max-w-md max-h-[90vh] rounded-lg bg-white shadow-xl flex flex-col"
          >
            <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
              <div>
                <h2
                  id={`inventory-pet-consume-title-${petConsumeTitleId}`}
                  className="text-lg font-semibold text-gray-900"
                >
                  {t("inventory.pet.consume.title")}
                </h2>
                <p
                  id={`inventory-pet-consume-subtitle-${petConsumeSubtitleId}`}
                  className="text-sm text-gray-500"
                >
                  {t("inventory.pet.consume.subtitle")}
                </p>
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

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={submitPetConsume}>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-4">
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
                {petConsumeError && <InlineAlert tone="error" message={petConsumeError} />}
              </div>

              <div className="border-t px-6 py-4 flex flex-wrap justify-end gap-2 bg-white">
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
