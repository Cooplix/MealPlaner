import type { PurchaseEntry } from "../types";

export type NormalizedBaseUnit = "kg" | "l" | "pcs" | "unit";

export interface NormalizedQuantity {
  amount: number;
  baseUnit: NormalizedBaseUnit;
}

const MASS_CONVERSIONS: Record<string, number> = {
  kg: 1,
  g: 1 / 1000,
  mg: 1 / 1_000_000,
  lb: 0.453592,
  oz: 0.0283495,
};

const VOLUME_CONVERSIONS: Record<string, number> = {
  l: 1,
  ml: 1 / 1000,
  cup: 0.236588,
  tbsp: 0.0147868,
  tsp: 0.00492892,
};

export function normalizeQuantity(amount: number, unit: string): NormalizedQuantity | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const normalizedUnit = unit.trim().toLowerCase();

  if (normalizedUnit in MASS_CONVERSIONS) {
    return { amount: amount * MASS_CONVERSIONS[normalizedUnit], baseUnit: "kg" };
  }
  if (normalizedUnit in VOLUME_CONVERSIONS) {
    return { amount: amount * VOLUME_CONVERSIONS[normalizedUnit], baseUnit: "l" };
  }
  if (normalizedUnit === "pcs") {
    return { amount, baseUnit: "pcs" };
  }
  return null;
}

export function computeUnitPrice(
  purchase: Pick<PurchaseEntry, "amount" | "unit" | "price">,
): { pricePerUnit: number; unitLabel: NormalizedBaseUnit } | null {
  const normalized = normalizeQuantity(purchase.amount, purchase.unit);
  if (!normalized) return null;
  const unitAmount = normalized.amount;
  if (!Number.isFinite(unitAmount) || unitAmount <= 0) return null;
  const pricePerUnit = purchase.price / unitAmount;
  return { pricePerUnit, unitLabel: normalized.baseUnit };
}

export function convertQuantity(amount: number, fromUnit: string, toUnit: string): number | null {
  const from = fromUnit.trim().toLowerCase();
  const to = toUnit.trim().toLowerCase();
  if (from === to) return amount;

  if (from in MASS_CONVERSIONS && to in MASS_CONVERSIONS) {
    const inKg = amount * MASS_CONVERSIONS[from];
    return inKg / MASS_CONVERSIONS[to];
  }

  if (from in VOLUME_CONVERSIONS && to in VOLUME_CONVERSIONS) {
    const inLiters = amount * VOLUME_CONVERSIONS[from];
    return inLiters / VOLUME_CONVERSIONS[to];
  }

  if (from === "pcs" && to === "pcs") {
    return amount;
  }

  return null;
}
