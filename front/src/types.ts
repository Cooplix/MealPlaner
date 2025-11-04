export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  qty: number;
}

export interface Dish {
  id: string;
  name: string;
  meal: MealSlot;
  ingredients: Ingredient[];
  calories: number;
  notes?: string;
  createdBy?: string | null;
  createdByName?: string | null;
}

export interface DayPlan {
  dateISO: string;
  slots: Partial<Record<MealSlot, string>>;
}

export interface ShoppingListItem {
  name: string;
  unit: string;
  qty: number;
  dishes: string[];
}

export interface ShoppingListResponse {
  range: { start: string; end: string };
  items: ShoppingListItem[];
}

export interface UserProfile {
  id: string;
  login: string;
  name: string;
  isAdmin: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface IngredientOption {
  key: string;
  name: string;
  unit: string;
  translations: Record<string, string>;
  usageCount?: number;
}

export interface CalorieEntry {
  id: string;
  ingredientKey: string;
  ingredientName: string;
  amount: number;
  unit: string;
  calories: number;
}
