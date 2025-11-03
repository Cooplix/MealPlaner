import type {
  DayPlan,
  Dish,
  IngredientOption,
  ShoppingListResponse,
  TokenResponse,
  UserProfile,
} from "./types";

const envApiRoot = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const API_ROOT =
  envApiRoot && envApiRoot.length > 0
    ? envApiRoot
    : import.meta.env.DEV
      ? "http://localhost:8000/api"
      : "/api";

const TOKEN_STORAGE_KEY = "mealplanner_access_token";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

let authToken: string | null = null;

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

function persistToken(token: string | null): void {
  authToken = token;
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

persistToken(getStoredToken());

async function request<T>(path: string, init?: RequestInit, includeAuth = true): Promise<T> {
  const headers: HeadersInit = { "Content-Type": "application/json", ...(init?.headers ?? {}) };
  if (includeAuth && authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers,
  });
  if (response.status === 401) {
    throw new UnauthorizedError();
  }
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${body || "request failed"}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

function sanitizeDishPayload(dish: Dish): Partial<Dish> {
  const { id, createdBy, createdByName, ...rest } = dish;
  return { ...rest, id };
}

function sortedByName(dishes: Dish[]): Dish[] {
  return [...dishes].sort((a, b) => a.name.localeCompare(b.name));
}

export const api = {
  getToken(): string | null {
    return authToken;
  },

  setToken(token: string | null): void {
    persistToken(token);
  },

  async login(login: string, password: string): Promise<TokenResponse> {
    const data = await request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ login, password }),
    }, false);
    persistToken(data.access_token);
    return data;
  },

  async currentUser(): Promise<UserProfile> {
    return request<UserProfile>("/users/me");
  },

  async listDishes(): Promise<Dish[]> {
    const data = await request<Dish[]>("/dishes");
    return sortedByName(data);
  },

  async createDish(dish: Dish): Promise<Dish> {
    const payload = sanitizeDishPayload(dish);
    const saved = await request<Dish>("/dishes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return saved;
  },

  async updateDish(id: string, dish: Dish): Promise<Dish> {
    const payload = sanitizeDishPayload(dish);
    const saved = await request<Dish>(`/dishes/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return saved;
  },

  async deleteDish(id: string): Promise<void> {
    await request<void>(`/dishes/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  async listPlans(params?: { start?: string; end?: string }): Promise<DayPlan[]> {
    const query = new URLSearchParams();
    if (params?.start) query.set("start", params.start);
    if (params?.end) query.set("end", params.end);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const plans = await request<DayPlan[]>(`/plans${suffix}`);
    return plans.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  },

  async upsertPlan(plan: DayPlan): Promise<DayPlan> {
    const saved = await request<DayPlan>(`/plans/${plan.dateISO}`, {
      method: "PUT",
      body: JSON.stringify(plan),
    });
    return saved;
  },

  async deletePlan(dateISO: string): Promise<void> {
    await request<void>(`/plans/${dateISO}`, { method: "DELETE" });
  },

  async shoppingList(range: { start: string; end: string }): Promise<ShoppingListResponse> {
    const params = new URLSearchParams({ start: range.start, end: range.end });
    return request<ShoppingListResponse>(`/shopping-list?${params.toString()}`);
  },

  async listIngredients(): Promise<IngredientOption[]> {
    return request<IngredientOption[]>("/ingredients");
  },

  async addIngredient(payload: {
    name: string;
    unit: string;
    translations: Record<string, string>;
  }): Promise<IngredientOption> {
    return request<IngredientOption>("/ingredients", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateIngredient(key: string, payload: {
    name: string;
    unit: string;
    translations: Record<string, string>;
  }): Promise<IngredientOption> {
    return request<IngredientOption>(`/ingredients/${encodeURIComponent(key)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};
