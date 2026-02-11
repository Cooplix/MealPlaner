import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../features/calendar/CalendarPage", () => ({
  CalendarPage: () => <div data-testid="calendar-page">calendar</div>,
}));

vi.mock("../features/dishes/DishesPage", () => ({
  DishesPage: () => <div data-testid="dishes-page">dishes</div>,
}));

vi.mock("../features/shopping/ShoppingPage", () => ({
  ShoppingPage: () => <div data-testid="shopping-page">shopping</div>,
}));

vi.mock("../features/ingredients/IngredientsPage", () => ({
  IngredientsPage: () => <div data-testid="ingredients-page">ingredients</div>,
}));

vi.mock("../features/calories/CaloriesPage", () => ({
  CaloriesPage: () => <div data-testid="calories-page">calories</div>,
}));

vi.mock("../features/purchases/PurchasesPage", () => ({
  PurchasesPage: () => <div data-testid="purchases-page">purchases</div>,
}));

vi.mock("../features/spending/SpendingPage", () => ({
  SpendingPage: () => <div data-testid="spending-page">spending</div>,
}));

vi.mock("../features/dishCosts/DishCostsPage", () => ({
  DishCostsPage: () => <div data-testid="dish-costs-page">dish-costs</div>,
}));

vi.mock("../features/profile/ProfilePage", () => ({
  ProfilePage: () => <div data-testid="profile-page">profile</div>,
}));

vi.mock("../features/inventory/InventoryPage", () => ({
  InventoryPage: () => <div data-testid="inventory-page">inventory</div>,
}));

vi.mock("../api", () => {
  let token: string | null = null;
  const defaultUser = {
    id: "user-1",
    login: "demo",
    name: "Demo User",
    isAdmin: false,
  };

  class UnauthorizedError extends Error {
    constructor(message = "Unauthorized") {
      super(message);
      this.name = "UnauthorizedError";
    }
  }

  return {
    UnauthorizedError,
    api: {
      getToken: vi.fn(() => token),
      setToken: vi.fn((value: string | null) => {
        token = value;
      }),
      login: vi.fn(async () => {
        token = "token-1";
        return {
          access_token: token,
          token_type: "bearer",
          user: defaultUser,
        };
      }),
      currentUser: vi.fn(async () => defaultUser),
      getReferenceData: vi.fn(async () => ({
        units: ["g", "kg"],
        inventoryCategories: ["Other"],
        inventoryLocations: ["Pantry"],
      })),
      listDishes: vi.fn(async () => []),
      listPlans: vi.fn(async () => []),
      listIngredients: vi.fn(async () => []),
      listCalorieEntries: vi.fn(async () => []),
      listPurchases: vi.fn(async () => []),
      createDish: vi.fn(async () => undefined),
      updateDish: vi.fn(async () => undefined),
      deleteDish: vi.fn(async () => undefined),
      upsertPlan: vi.fn(async () => undefined),
      deletePlan: vi.fn(async () => undefined),
      addIngredient: vi.fn(async () => undefined),
      updateIngredient: vi.fn(async () => undefined),
      addCalorieEntry: vi.fn(async () => undefined),
      updateCalorieEntry: vi.fn(async () => undefined),
      createPurchase: vi.fn(async () => undefined),
      shoppingList: vi.fn(async () => ({ range: { start: "", end: "" }, items: [] })),
    },
  };
});

import App from "../App";
import { api } from "../api";
import { I18nProvider } from "../i18n";

function renderApp() {
  return render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  );
}

describe("App smoke", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    api.setToken(null);
    vi.clearAllMocks();
    window.localStorage.setItem("mealplanner_language", "en");
  });

  it("completes login and allows top-level navigation", async () => {
    const user = userEvent.setup();
    renderApp();

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Login"), "demo");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByTestId("calendar-page")).toBeInTheDocument();
    expect(api.login).toHaveBeenCalledWith("demo", "secret");

    await user.click(screen.getByRole("button", { name: "Dishes" }));
    expect(screen.getByTestId("dishes-page")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Menu/i }));
    await user.click(screen.getByRole("button", { name: "Inventory management" }));
    expect(screen.getByTestId("inventory-page")).toBeInTheDocument();
  });

  it("restores a persisted session and supports logout", async () => {
    const user = userEvent.setup();
    api.setToken("persisted-token");
    renderApp();

    expect(await screen.findByTestId("calendar-page")).toBeInTheDocument();
    expect(api.currentUser).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /Menu/i }));
    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(api.setToken).toHaveBeenCalledWith(null);
  });
});
