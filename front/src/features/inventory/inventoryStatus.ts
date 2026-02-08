import type { ExpiryStatus, RestockStatus } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getExpiryStatus(expiresAt?: string | null, today: Date = new Date()): ExpiryStatus {
  const expiry = toDate(expiresAt);
  if (!expiry) return "OK";

  const todayStart = startOfDay(today).getTime();
  const expiryStart = startOfDay(expiry).getTime();
  const diffDays = Math.floor((expiryStart - todayStart) / MS_PER_DAY);

  if (diffDays < 0) return "EXPIRED";
  if (diffDays <= 14) return "<=14d";
  if (diffDays <= 30) return "<=30d";
  return "OK";
}

export function getRestockStatus(quantity: number, minQty?: number | null): RestockStatus {
  if (minQty == null) return "OK";
  return quantity < minQty ? "RESTOCK" : "OK";
}

export function getToBuy(quantity: number, minQty?: number | null, maxQty?: number | null): number {
  if (minQty == null || maxQty == null) return 0;
  if (quantity >= minQty) return 0;
  return Math.max(0, Number((maxQty - quantity).toFixed(2)));
}
