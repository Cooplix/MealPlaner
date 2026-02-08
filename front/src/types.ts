export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export interface Ingredient {
  id: string;
  ingredientKey?: string;
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

export interface DishCostBreakdown {
  dishId: string;
  ingredientCosts: Array<{
    ingredientName: string;
    amount: number;
    unit: string;
    cost: number;
    currency: string;
  }>;
  totalCost: number;
  missing: Array<{ ingredientName: string; unit: string }>;
}

export interface DishCostSummary {
  dishId: string;
  name: string;
  totalCost: number;
  missingIngredients: Array<{ ingredient: string; unit: string }>;
  ingredients: Array<{ ingredient: string; amount: number; unit: string; cost: number }>;
}

export interface DishCostAnalyticsResponse {
  dishes: DishCostSummary[];
  totalDishCost: number;
  missingCount: number;
  totalSpent: number;
}

export interface DayPlan {
  dateISO: string;
  slots: Partial<Record<MealSlot, string>>;
}

export interface ShoppingListItem {
  ingredientKey?: string | null;
  name: string;
  unit: string;
  qty: number;
  requiredQty?: number;
  inStockQty?: number;
  toBuyQty?: number;
  dishes: string[];
}

export interface ShoppingListResponse {
  range: { start: string; end: string };
  items: ShoppingListItem[];
}

export interface SpendingStats {
  totalSpent: number;
  averageDailySpend: number;
  medianDailySpend: number;
  daysTracked: number;
  averagePurchase: number;
  normalizedUnit?: string | null;
  totalNormalizedQuantity?: number | null;
  averageUnitPrice?: number | null;
}

export interface SpendingDailyTotal {
  date: string;
  total: number;
}

export interface SpendingTopSpender {
  ingredientKey: string;
  total: number;
  share: number;
  count: number;
  averageUnitPrice?: number | null;
  unitLabel?: string | null;
}

export interface NutritionStats {
  totalCalories: number;
  averageDailyCalories: number;
  caloriesPerPurchase: number;
  daysTracked: number;
  purchasesWithCalories: number;
}

export interface TopCalorieItem {
  ingredientKey: string;
  totalCalories: number;
  count: number;
  normalizedAmount?: number | null;
  normalizedUnit?: string | null;
}

export interface SpendingAnalyticsResponse {
  range?: { start?: string | null; end?: string | null } | null;
  ingredientKey?: string | null;
  purchaseCount: number;
  totals: SpendingStats;
  allTime: SpendingStats;
  dailyTotals: SpendingDailyTotal[];
  topSpenders: SpendingTopSpender[];
  nutrition: NutritionStats;
  topCalories: TopCalorieItem[];
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

export interface PurchaseEntry {
  id: string;
  ingredientKey: string;
  ingredientName: string;
  amount: number;
  unit: string;
  price: number;
  purchasedAt: string;
}

export interface ReferenceData {
  units: string[];
  inventoryCategories: string[];
  inventoryLocations: string[];
  unitConversions?: {
    mass: Record<string, number>;
    volume: Record<string, number>;
  };
}
