import type { CalorieEntry, PurchaseEntry } from "../types";
import { normalizeQuantity, convertQuantity, type NormalizedBaseUnit } from "./pricing";

export interface SpendStats {
  totalSpent: number;
  averageDailySpend: number;
  medianDailySpend: number;
  daysTracked: number;
  normalizedUnit?: NormalizedBaseUnit;
  totalNormalizedQuantity?: number;
  averageUnitPrice?: number;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function calculateSpendStats(purchases: PurchaseEntry[]): SpendStats {
  if (!purchases.length) {
    return { totalSpent: 0, averageDailySpend: 0, medianDailySpend: 0, daysTracked: 0 };
  }

  const byDate = new Map<string, number>();
  let minDate = new Date(purchases[0].purchasedAt);
  let maxDate = minDate;
  const normalizedTotals = new Map<NormalizedBaseUnit, { amount: number; price: number }>();

  purchases.forEach((purchase) => {
    const date = new Date(purchase.purchasedAt);
    if (date < minDate) minDate = date;
    if (date > maxDate) maxDate = date;
    const key = purchase.purchasedAt.slice(0, 10);
    byDate.set(key, (byDate.get(key) ?? 0) + purchase.price);

    const normalized = normalizeQuantity(purchase.amount, purchase.unit);
    if (normalized) {
      const bucket = normalizedTotals.get(normalized.baseUnit) ?? { amount: 0, price: 0 };
      bucket.amount += normalized.amount;
      bucket.price += purchase.price;
      normalizedTotals.set(normalized.baseUnit, bucket);
    }
  });

  const totalSpent = Array.from(byDate.values()).reduce((sum, value) => sum + value, 0);
  const dayDiff = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const averageDailySpend = totalSpent / dayDiff;
  const medianDailySpend = median(Array.from(byDate.values()));

  const stats: SpendStats = {
    totalSpent,
    averageDailySpend,
    medianDailySpend,
    daysTracked: dayDiff,
  };

  if (normalizedTotals.size > 0) {
    const entries = Array.from(normalizedTotals.entries());
    const [initialUnit, initialInfo] = entries[0];
    const [unit, info] = entries.reduce<[NormalizedBaseUnit, { amount: number; price: number }]>(
      (best, current) => (current[1].amount > best[1].amount ? current : best),
      [initialUnit, initialInfo],
    );
    if (info.amount > 0) {
      stats.normalizedUnit = unit;
      stats.totalNormalizedQuantity = info.amount;
      stats.averageUnitPrice = info.price / info.amount;
    }
  }

  return stats;
}

export interface NutritionStats {
  totalCalories: number;
  averageDailyCalories: number;
  caloriesPerPurchase: number;
  daysTracked: number;
  purchasesWithCalories: number;
}

export interface IngredientCalorieBreakdown {
  ingredientKey: string;
  totalCalories: number;
  count: number;
  normalizedAmount?: number;
  normalizedUnit?: NormalizedBaseUnit;
}

export interface NutritionStatsResult {
  stats: NutritionStats;
  perIngredient: IngredientCalorieBreakdown[];
}

export function calculateNutritionStats(
  purchases: PurchaseEntry[],
  calorieEntries: CalorieEntry[],
): NutritionStatsResult {
  if (!purchases.length || !calorieEntries.length) {
    return {
      stats: {
        totalCalories: 0,
        averageDailyCalories: 0,
        caloriesPerPurchase: 0,
        daysTracked: purchases.length ? 1 : 0,
        purchasesWithCalories: 0,
      },
      perIngredient: [],
    };
  }

  const entryMap = new Map<string, CalorieEntry[]>();
  calorieEntries.forEach((entry) => {
    const list = entryMap.get(entry.ingredientKey) ?? [];
    list.push(entry);
    entryMap.set(entry.ingredientKey, list);
  });

  let minDate = new Date(purchases[0].purchasedAt);
  let maxDate = minDate;
  let totalCalories = 0;
  let purchasesWithCalories = 0;
  const ingredientTotals = new Map<string, { calories: number; count: number; normalizedAmount: number; normalizedUnit?: NormalizedBaseUnit }>();

  purchases.forEach((purchase) => {
    const date = new Date(purchase.purchasedAt);
    if (date < minDate) minDate = date;
    if (date > maxDate) maxDate = date;

    const entries = entryMap.get(purchase.ingredientKey);
    if (!entries?.length) return;

    let caloriesForPurchase: number | null = null;
    for (const entry of entries) {
      if (entry.amount <= 0) continue;
      const converted = convertQuantity(purchase.amount, purchase.unit, entry.unit);
      if (converted === null) continue;
      const candidate = (converted / entry.amount) * entry.calories;
      if (!Number.isFinite(candidate)) continue;
      caloriesForPurchase = candidate;
      break;
    }

    if (caloriesForPurchase === null) return;

    totalCalories += caloriesForPurchase;
    purchasesWithCalories += 1;

    const normalized = normalizeQuantity(purchase.amount, purchase.unit);
    const bucket = ingredientTotals.get(purchase.ingredientKey) ?? {
      calories: 0,
      count: 0,
      normalizedAmount: 0,
      normalizedUnit: normalized?.baseUnit,
    };
    bucket.calories += caloriesForPurchase;
    bucket.count += 1;
    if (normalized) {
      bucket.normalizedAmount += normalized.amount;
      bucket.normalizedUnit = normalized.baseUnit;
    }
    ingredientTotals.set(purchase.ingredientKey, bucket);
  });

  const dayDiff = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const averageDailyCalories = totalCalories / dayDiff;
  const caloriesPerPurchase = purchasesWithCalories > 0 ? totalCalories / purchasesWithCalories : 0;

  const perIngredient = Array.from(ingredientTotals.entries())
    .map(([ingredientKey, info]) => ({
      ingredientKey,
      totalCalories: info.calories,
      count: info.count,
      normalizedAmount: info.normalizedAmount,
      normalizedUnit: info.normalizedUnit,
    }))
    .sort((a, b) => b.totalCalories - a.totalCalories);

  return {
    stats: {
      totalCalories,
      averageDailyCalories,
      caloriesPerPurchase,
      daysTracked: dayDiff,
      purchasesWithCalories,
    },
    perIngredient,
  };
}
