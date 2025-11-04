// front/src/App.tsx
import {useCallback, useEffect, useState} from "react";

import "./App.css";
import {api, UnauthorizedError} from "./api";
import {useTranslation} from "./i18n";

import {LanguageSwitcher} from "./components/LanguageSwitcher";
import {TabButton} from "./components/TabButton";

import {LoginPage} from "./features/auth/LoginPage";
import {CalendarPage} from "./features/calendar/CalendarPage";
import {DishesPage} from "./features/dishes/DishesPage";
import {IngredientsPage} from "./features/ingredients/IngredientsPage";
import {ShoppingPage} from "./features/shopping/ShoppingPage";

import type {DayPlan, Dish, IngredientOption, ShoppingListResponse, UserProfile,} from "./types";

type TabId = "calendar" | "dishes" | "shopping" | "ingredients";

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error ?? "unknown error");
}

function App() {
    const {t, languages} = useTranslation();

    const [user, setUser] = useState<UserProfile | null>(null);
    const [initializing, setInitializing] = useState(true);

    const [activeTab, setActiveTab] = useState<TabId>("calendar");

    const [dishes, setDishes] = useState<Dish[]>([]);
    const [plans, setPlans] = useState<DayPlan[]>([]);
    const [ingredientOptions, setIngredientOptions] = useState<IngredientOption[]>([]);

    const [loadingData, setLoadingData] = useState(false);
    const [globalError, setGlobalError] = useState<string | null>(null);

    const [loginSubmitting, setLoginSubmitting] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);

    const loadAllData = useCallback(async () => {
        setLoadingData(true);
        setGlobalError(null);

        try {
            const [dishesRes, plansRes, ingredientsRes] = await Promise.all([
                api.listDishes(),
                api.listPlans(),
                api.listIngredients(),
            ]);
            setDishes(dishesRes);
            setPlans(plansRes);
            setIngredientOptions(ingredientsRes);
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
    }, [t]);

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

    function handleLogout() {
        api.setToken(null);
        setUser(null);
        setDishes([]);
        setPlans([]);
        setIngredientOptions([]);
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
        translations: Partial<Record<string, string>>;
    }): void {
        void (async () => {
            try {
                const translations: Record<string, string> = {};
                for (const [key, value] of Object.entries(payload.translations)) {
                    if (value != null && value !== "") {
                        translations[key] = value;
                    }
                }

                const saved = await api.addIngredient({
                    name: payload.name,
                    unit: payload.unit,
                    translations,
                });

                setIngredientOptions((prev) => {
                    if (prev.some((item) => item.key === saved.key)) return prev;
                    return [...prev, saved];
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

    function handleUpdateIngredientTranslation(payload: {
        key: string;
        language: string;
        value: string;
        name: string;
        unit: string;
    }): void {
        void (async () => {
            try {
                const existing = ingredientOptions.find((item) => item.key === payload.key);
                const prevTranslations = existing?.translations ?? {};
                const nextTranslations = {
                    ...prevTranslations,
                    [payload.language]: payload.value,
                };

                const saved = await api.updateIngredient(payload.key, {
                    name: payload.name,
                    unit: payload.unit,
                    translations: nextTranslations,
                });

                setIngredientOptions((prev) =>
                    prev.map((item) => (item.key === saved.key ? saved : item)),
                );
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
                <div className="mx-auto max-w-5xl flex items-center justify-between gap-4 px-4 py-3">
                    <div>
                        <div className="text-xl font-semibold text-gray-900">
                            {t("app.title")}
                            <span className="ml-2 text-sm font-normal text-gray-500">
                                {user.name}
                            </span>
                        </div>
                        <div className="text-xs text-gray-400">{user.login}</div>
                    </div>
                    <div className="flex items-center gap-4">
                        <LanguageSwitcher/>
                        <button
                            className="text-sm px-3 py-1.5 rounded-lg border"
                            onClick={handleLogout}
                        >
                            {t("auth.logout")}
                        </button>
                    </div>
                </div>
                <div className="border-t bg-gray-50">
                    <div className="mx-auto max-w-5xl px-4 py-2 flex gap-2">
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
                            label={t("tabs.ingredients") as string}
                            active={activeTab === "ingredients"}
                            onClick={() => setActiveTab("ingredients")}
                        />
                    </div>
                </div>
            </header>

            <main className="flex-1">
                <div className="mx-auto max-w-5xl px-4 py-4 space-y-4">
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
                        />
                    )}
                    {activeTab === "shopping" && (
                        <ShoppingPage fetchList={fetchShoppingList}/>
                    )}
                    {activeTab === "ingredients" && (
                        <IngredientsPage
                            ingredients={ingredientOptions}
                            languages={languages}
                            onAddIngredient={handleAddIngredient}
                            onUpdateTranslation={handleUpdateIngredientTranslation}
                        />
                    )}
                </div>
            </main>

            <footer className="border-t bg-white mt-8">
                <div className="mx-auto max-w-5xl px-4 py-3 text-xs text-gray-500">
                    {t("app.footer") as string}
                </div>
            </footer>
        </div>
    );
}

export default App;
