// front/src/App.tsx
import {useCallback, useEffect, useState} from "react";

import "./App.css";
import {api, UnauthorizedError} from "./api";
import {useTranslation} from "./i18n";
import { MEASUREMENT_UNITS } from "./constants/measurementUnits";
import { INVENTORY_CATEGORIES, INVENTORY_LOCATIONS } from "./constants/inventoryDefaults";

import {HeaderMenu} from "./components/HeaderMenu";
import {LanguageSwitcher} from "./components/LanguageSwitcher";
import {TabButton} from "./components/TabButton";

import {LoginPage} from "./features/auth/LoginPage";
import {CalendarPage} from "./features/calendar/CalendarPage";
import {DishesPage} from "./features/dishes/DishesPage";
import {InventoryPage} from "./features/inventory/InventoryPage";
import {IngredientsPage} from "./features/ingredients/IngredientsPage";
import {ShoppingPage} from "./features/shopping/ShoppingPage";
import {CaloriesPage} from "./features/calories/CaloriesPage";
import {ProfilePage} from "./features/profile/ProfilePage";
import {PurchasesPage} from "./features/purchases/PurchasesPage";
import {SpendingPage} from "./features/spending/SpendingPage";
import {DishCostsPage} from "./features/dishCosts/DishCostsPage";

import type {
    CalorieEntry,
    DayPlan,
    Dish,
    IngredientOption,
    PurchaseEntry,
    ReferenceData,
    ShoppingListResponse,
    UserProfile,
} from "./types";

type TabId = "calendar" | "dishes" | "shopping" | "ingredients" | "calories" | "purchases" | "spending" | "dishCosts" | "profile" | "inventory";

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error ?? "unknown error");
}

function App() {
    const {t} = useTranslation();

    const [user, setUser] = useState<UserProfile | null>(null);
    const [initializing, setInitializing] = useState(true);

    const [activeTab, setActiveTab] = useState<TabId>("calendar");

    const [dishes, setDishes] = useState<Dish[]>([]);
    const [plans, setPlans] = useState<DayPlan[]>([]);
    const [ingredientOptions, setIngredientOptions] = useState<IngredientOption[]>([]);
    const [calorieEntries, setCalorieEntries] = useState<CalorieEntry[]>([]);
    const [purchases, setPurchases] = useState<PurchaseEntry[]>([]);
    const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);

    const [loadingData, setLoadingData] = useState(false);
    const [globalError, setGlobalError] = useState<string | null>(null);

    const [loginSubmitting, setLoginSubmitting] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);

    const handleLogout = useCallback(() => {
        api.setToken(null);
        setUser(null);
        setDishes([]);
        setPlans([]);
        setIngredientOptions([]);
        setCalorieEntries([]);
        setPurchases([]);
        setReferenceData(null);
    }, []);

    const loadAllData = useCallback(async () => {
        setLoadingData(true);
        setGlobalError(null);

        try {
            void api.getReferenceData()
                .then((data) => setReferenceData(data))
                .catch((error) => console.error(error));

            const [dishesRes, plansRes, ingredientsRes, caloriesRes, purchasesRes] = await Promise.all([
                api.listDishes(),
                api.listPlans(),
                api.listIngredients(),
                api.listCalorieEntries(),
                api.listPurchases(),
            ]);
            setDishes(dishesRes);
            setPlans(plansRes);
            setIngredientOptions(ingredientsRes);
            const collator = new Intl.Collator(undefined, { sensitivity: "base" });
            setCalorieEntries(
                [...caloriesRes].sort((a, b) =>
                    collator.compare(a.ingredientName, b.ingredientName) || a.unit.localeCompare(b.unit),
                ),
            );
            setPurchases(
                [...purchasesRes].sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt)),
            );
        } catch (error) {
            console.error(error);
            if (error instanceof UnauthorizedError) {
                handleLogout();
                return;
            }
            const msg = getErrorMessage(error);
            setGlobalError(
                (t("errors.loadData", {message: msg}) as string) ??
                `${t("common.unknownError")}: ${msg}`,
            );
        } finally {
            setLoadingData(false);
        }
    }, [t, handleLogout]);

    const referenceUnits = referenceData?.units?.length ? referenceData.units : MEASUREMENT_UNITS;
    const referenceCategories = referenceData?.inventoryCategories?.length
        ? referenceData.inventoryCategories
        : INVENTORY_CATEGORIES;
    const referenceLocations = referenceData?.inventoryLocations?.length
        ? referenceData.inventoryLocations
        : INVENTORY_LOCATIONS;

    useEffect(() => {
        // Автовідновлення сесії, якщо токен уже є
        const token = api.getToken();
        if (!token) {
            setInitializing(false);
            return;
        }

        (async () => {
            try {
                const profile = await api.currentUser();
                setUser(profile);
                await loadAllData();
            } catch (error) {
                console.error(error);
                if (error instanceof UnauthorizedError) {
                    api.setToken(null);
                }
            } finally {
                setInitializing(false);
            }
        })();
    }, [loadAllData]);

    const refreshCalorieEntries = useCallback(async () => {
        try {
            const entries = await api.listCalorieEntries();
            const collator = new Intl.Collator(undefined, { sensitivity: "base" });
            setCalorieEntries(
                [...entries].sort((a, b) =>
                    collator.compare(a.ingredientName, b.ingredientName) || a.unit.localeCompare(b.unit),
                ),
            );
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => {
        if (activeTab !== "ingredients" || !user) return;
        void (async () => {
            try {
                const fresh = await api.listIngredients();
                setIngredientOptions(fresh);
                await refreshCalorieEntries();
            } catch (error) {
                console.error(error);
                if (error instanceof UnauthorizedError) {
                    handleLogout();
                    return;
                }
                const msg = getErrorMessage(error);
                setGlobalError(
                    (t("errors.saveCalories", {message: msg}) as string) ??
                    `${t("common.unknownError")}: ${msg}`,
                );
            }
        })();
    }, [activeTab, user, t, refreshCalorieEntries, handleLogout]);

    useEffect(() => {
        if (activeTab !== "calories" || !user) return;
        void refreshCalorieEntries();
    }, [activeTab, user, refreshCalorieEntries]);

    const refreshPurchases = useCallback(async () => {
        try {
            const data = await api.listPurchases();
            setPurchases(
                [...data].sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt)),
            );
        } catch (error) {
            console.error(error);
            if (error instanceof UnauthorizedError) {
                handleLogout();
                return;
            }
            const msg = getErrorMessage(error);
            setGlobalError(
                (t("errors.loadPurchases", {message: msg}) as string) ??
                `${t("common.unknownError")}: ${msg}`,
            );
        }
    }, [t, handleLogout]);

    async function handleLogin(credentials: { login: string; password: string }) {
        setLoginSubmitting(true);
        setLoginError(null);
        try {
            const data = await api.login(credentials.login, credentials.password);
            setUser(data.user);
            await loadAllData();
        } catch (error) {
            console.error(error);
            if (error instanceof UnauthorizedError) {
                setLoginError(t("auth.error") as string);
            } else {
                setLoginError(getErrorMessage(error));
            }
        } finally {
            setLoginSubmitting(false);
        }
    }

    async function handleUpsertDish(dish: Dish): Promise<void> {
        try {
            const exists = dishes.some((item) => item.id === dish.id);
            const saved = exists
                ? await api.updateDish(dish.id, dish)
                : await api.createDish(dish);

            setDishes((prev) => {
                const others = prev.filter((item) => item.id !== saved.id);
                return [...others, saved].sort((a, b) => a.name.localeCompare(b.name));
            });
        } catch (error) {
            console.error(error);
            if (error instanceof UnauthorizedError) {
                handleLogout();
                return;
            }
            const msg = getErrorMessage(error);
            setGlobalError(
                (t("errors.saveDish", {message: msg}) as string) ??
                `${t("common.unknownError")}: ${msg}`,
            );
        }
    }

    async function handleDeleteDish(id: string): Promise<void> {
        try {
            await api.deleteDish(id);
            setDishes((prev) => prev.filter((dish) => dish.id !== id));
        } catch (error) {
            console.error(error);
            if (error instanceof UnauthorizedError) {
                handleLogout();
                return;
            }
            const msg = getErrorMessage(error);
            setGlobalError(
                (t("errors.saveDish", {message: msg}) as string) ??
                `${t("common.unknownError")}: ${msg}`,
            );
        }
    }

    async function handleUpsertPlan(plan: DayPlan): Promise<void> {
        try {
            const saved = await api.upsertPlan(plan);
            setPlans((prev) => {
                const others = prev.filter((item) => item.dateISO !== saved.dateISO);
                return [...others, saved].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
            });
        } catch (error) {
            console.error(error);
            if (error instanceof UnauthorizedError) {
                handleLogout();
                return;
            }
            const msg = getErrorMessage(error);
            setGlobalError(
                (t("errors.savePlan", {message: msg}) as string) ??
                `${t("common.unknownError")}: ${msg}`,
            );
        }
    }

    async function handleDeletePlan(dateISO: string): Promise<void> {
        try {
            await api.deletePlan(dateISO);
            setPlans((prev) => prev.filter((plan) => plan.dateISO !== dateISO));
        } catch (error) {
            console.error(error);
            if (error instanceof UnauthorizedError) {
                handleLogout();
                return;
            }
            const msg = getErrorMessage(error);
            setGlobalError(
                (t("errors.savePlan", {message: msg}) as string) ??
                `${t("common.unknownError")}: ${msg}`,
            );
        }
    }

    function handleAddIngredient(payload: {
        name: string;
        unit: string;
    }): void {
        void (async () => {
            try {
                const saved = await api.addIngredient({
                    name: payload.name.trim(),
                    unit: payload.unit.trim(),
                    translations: {},
                });

                setIngredientOptions((prev) => {
                    if (prev.some((item) => item.key === saved.key)) return prev;
                    const collator = new Intl.Collator(undefined, { sensitivity: "base" });
                    return [...prev, saved].sort((a, b) => collator.compare(a.name, b.name));
                });
            } catch (error) {
                console.error(error);
                if (error instanceof UnauthorizedError) {
                    handleLogout();
                    return;
                }
                const msg = getErrorMessage(error);
                setGlobalError(
                    (t("errors.saveIngredient", {message: msg}) as string) ??
                    `${t("common.unknownError")}: ${msg}`,
                );
            }
        })();
    }

    function handleUpdateIngredient(payload: {
        key: string;
        name: string;
        unit: string;
    }): void {
        void (async () => {
            try {
                const trimmedName = payload.name.trim();
                const trimmedUnit = payload.unit.trim();
                const existing = ingredientOptions.find((item) => item.key === payload.key);

                const saved = await api.updateIngredient(payload.key, {
                    name: trimmedName,
                    unit: trimmedUnit,
                    translations: existing?.translations ?? {},
                });

                setIngredientOptions((prev) => {
                    const collator = new Intl.Collator(undefined, { sensitivity: "base" });
                    return prev
                        .map((item) => (item.key === saved.key ? saved : item))
                        .sort((a, b) => collator.compare(a.name, b.name));
                });
                void refreshCalorieEntries();
            } catch (error) {
                console.error(error);
                if (error instanceof UnauthorizedError) {
                    handleLogout();
                    return;
                }
                const msg = getErrorMessage(error);
                setGlobalError(
                    (t("errors.saveIngredient", {message: msg}) as string) ??
                    `${t("common.unknownError")}: ${msg}`,
                );
            }
        })();
    }

    function handleAddCalorieEntry(payload: {
        ingredientKey: string;
        amount: number;
        unit: string;
        calories: number;
    }): void {
        void (async () => {
            try {
                const saved = await api.addCalorieEntry(payload);
                setCalorieEntries((prev) => {
                    const collator = new Intl.Collator(undefined, { sensitivity: "base" });
                    const others = prev.filter((entry) => entry.id !== saved.id);
                    return [...others, saved].sort((a, b) =>
                        collator.compare(a.ingredientName, b.ingredientName) || a.unit.localeCompare(b.unit)
                    );
                });
            } catch (error) {
                console.error(error);
                if (error instanceof UnauthorizedError) {
                    handleLogout();
                    return;
                }
                const msg = getErrorMessage(error);
                setGlobalError(
                    (t("errors.saveCalories", {message: msg}) as string) ??
                    `${t("common.unknownError")}: ${msg}`,
                );
            }
        })();
    }

    function handleUpdateCalorieEntry(payload: {
        id: string;
        ingredientKey?: string;
        amount?: number;
        unit?: string;
        calories?: number;
    }): void {
        void (async () => {
            try {
                const saved = await api.updateCalorieEntry(payload.id, {
                    ingredientKey: payload.ingredientKey,
                    amount: payload.amount,
                    unit: payload.unit,
                    calories: payload.calories,
                });
                setCalorieEntries((prev) => {
                    const collator = new Intl.Collator(undefined, { sensitivity: "base" });
                    const updated = prev.map((entry) => (entry.id === saved.id ? saved : entry));
                    return [...updated].sort((a, b) =>
                        collator.compare(a.ingredientName, b.ingredientName) || a.unit.localeCompare(b.unit)
                    );
                });
            } catch (error) {
                console.error(error);
                if (error instanceof UnauthorizedError) {
                    handleLogout();
                    return;
                }
                const msg = getErrorMessage(error);
                setGlobalError(
                    (t("errors.saveIngredient", {message: msg}) as string) ??
                    `${t("common.unknownError")}: ${msg}`,
                );
            }
        })();
    }

    async function handleCreatePurchase(payload: {
        ingredientKey: string;
        amount: number;
        unit: string;
        price: number;
        purchasedAt: string;
        applyToInventory: boolean;
        location?: string;
    }): Promise<void> {
        try {
            await api.createPurchase(payload);
            await refreshPurchases();
        } catch (error) {
            console.error(error);
            if (error instanceof UnauthorizedError) {
                handleLogout();
                return;
            }
            const msg = getErrorMessage(error);
            setGlobalError(
                (t("errors.savePurchase", {message: msg}) as string) ??
                `${t("common.unknownError")}: ${msg}`,
            );
        }
    }

    async function fetchShoppingList(start: string, end: string): Promise<ShoppingListResponse> {
        try {
            return await api.shoppingList({start, end});
        } catch (error) {
            console.error(error);
            if (error instanceof UnauthorizedError) {
                handleLogout();
                throw error;
            }
            const msg = getErrorMessage(error);
            setGlobalError(
                (t("errors.shoppingList", {message: msg}) as string) ??
                `${t("common.unknownError")}: ${msg}`,
            );
            throw error;
        }
    }

    if (initializing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-sm text-gray-600">{t("app.loading")}</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-semibold text-gray-900">{t("app.title")}</h1>
                </div>
                <LoginPage
                    onSubmit={handleLogin}
                    submitting={loginSubmitting}
                    error={loginError}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="border-b bg-white">
                <div className="mx-auto max-w-7xl px-2 py-4 sm:px-4">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                            <div className="min-w-0">
                                <div className="text-xl font-semibold text-gray-900">
                                    {t("app.title")}
                                    <span className="ml-2 text-sm font-normal text-gray-500">
                                        {user.name}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-400 break-all">{user.login}</div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <nav className="flex flex-wrap gap-2 overflow-x-auto pb-1">
                                <TabButton
                                    label={t("tabs.calendar") as string}
                                    active={activeTab === "calendar"}
                                    onClick={() => setActiveTab("calendar")}
                                />
                                <TabButton
                                    label={t("tabs.dishes") as string}
                                    active={activeTab === "dishes"}
                                    onClick={() => setActiveTab("dishes")}
                                />
                                <TabButton
                                    label={t("tabs.shopping") as string}
                                    active={activeTab === "shopping"}
                                    onClick={() => setActiveTab("shopping")}
                                />
                                <TabButton
                                    label={t("tabs.purchases") as string}
                                    active={activeTab === "purchases"}
                                    onClick={() => setActiveTab("purchases")}
                                />
                                <TabButton
                                    label={t("tabs.spending") as string}
                                    active={activeTab === "spending"}
                                    onClick={() => setActiveTab("spending")}
                                />
                                <TabButton
                                    label={t("tabs.dishCosts") as string}
                                    active={activeTab === "dishCosts"}
                                    onClick={() => setActiveTab("dishCosts")}
                                />
                            </nav>
                            <div className="flex items-center gap-3 self-end lg:self-auto">
                                <LanguageSwitcher/>
                                <HeaderMenu
                                    menuLabel={t("app.menuLabel") as string}
                                    profileLabel={t("menu.profile") as string}
                                    inventoryLabel={t("menu.inventory") as string}
                                    ingredientsLabel={t("menu.ingredients") as string}
                                    caloriesLabel={t("menu.calories") as string}
                                    logoutLabel={t("menu.logout") as string}
                                    onSelectProfile={() => setActiveTab("profile")}
                                    onSelectInventory={() => setActiveTab("inventory")}
                                    onSelectIngredients={() => setActiveTab("ingredients")}
                                    onSelectCalories={() => setActiveTab("calories")}
                                    onLogout={handleLogout}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                <div className="mx-auto max-w-7xl px-2 py-4 sm:px-4 space-y-4">
                    {loadingData && (
                        <div className="rounded-lg border bg-white px-3 py-2 text-sm text-gray-600">
                            {t("app.loading")}
                        </div>
                    )}
                    {globalError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {globalError}
                        </div>
                    )}

                    {activeTab === "calendar" && (
                        <CalendarPage
                            dishes={dishes}
                            plans={plans}
                            ingredientOptions={ingredientOptions}
                            onUpsertPlan={handleUpsertPlan}
                            onDeletePlan={handleDeletePlan}
                        />
                    )}
                    {activeTab === "dishes" && (
                        <DishesPage
                            dishes={dishes}
                            plans={plans}
                            onUpsertDish={handleUpsertDish}
                            onDeleteDish={handleDeleteDish}
                            ingredientOptions={ingredientOptions}
                            units={referenceUnits}
                        />
                    )}
                    {activeTab === "shopping" && (
                        <ShoppingPage
                            fetchList={fetchShoppingList}
                            ingredientOptions={ingredientOptions}
                        />
                    )}
                    {activeTab === "ingredients" && (
                        <IngredientsPage
                            ingredients={ingredientOptions}
                            units={referenceUnits}
                            onAddIngredient={handleAddIngredient}
                            onUpdateIngredient={handleUpdateIngredient}
                        />
                    )}
                    {activeTab === "calories" && (
                        <CaloriesPage
                            ingredients={ingredientOptions}
                            entries={calorieEntries}
                            units={referenceUnits}
                            onAddEntry={handleAddCalorieEntry}
                            onUpdateEntry={handleUpdateCalorieEntry}
                        />
                    )}
                    {activeTab === "purchases" && (
                        <PurchasesPage
                            ingredients={ingredientOptions}
                            purchases={purchases}
                            units={referenceUnits}
                            locations={referenceLocations}
                            onCreatePurchase={handleCreatePurchase}
                            onRefresh={refreshPurchases}
                        />
                    )}
                    {activeTab === "spending" && (
                        <SpendingPage
                            ingredients={ingredientOptions}
                            purchases={purchases}
                            calorieEntries={calorieEntries}
                            onRefresh={refreshPurchases}
                        />
                    )}
                    {activeTab === "dishCosts" && (
                        <DishCostsPage
                            dishes={dishes}
                            purchases={purchases}
                            ingredients={ingredientOptions}
                            plans={plans}
                        />
                    )}
                    {activeTab === "profile" && (
                        <ProfilePage
                            user={user}
                            onUserChange={(updated) => setUser(updated)}
                        />
                    )}
                    {activeTab === "inventory" && (
                        <InventoryPage
                            ingredientOptions={ingredientOptions}
                            categories={referenceCategories}
                            locations={referenceLocations}
                            units={referenceUnits}
                        />
                    )}
                </div>
            </main>

            <footer className="border-t bg-white mt-8">
                <div className="mx-auto max-w-7xl px-2 py-3 sm:px-4 text-xs text-gray-500">
                    {t("app.footer") as string}
                </div>
            </footer>
        </div>
    );
}

export default App;
