export type ExpiryStatus = "OK" | "<=14d" | "<=30d" | "EXPIRED";
export type RestockStatus = "OK" | "RESTOCK";

export interface InventoryItem {
  id: string;
  ingredientKey?: string | null;
  name: string;
  baseName?: string | null;
  category?: string | null;
  location?: string | null;
  quantity: number;
  unit: string;
  minQty?: number | null;
  maxQty?: number | null;
  expiresAt?: string | null;
  addedAt?: string | null;
  notes?: string | null;
}

export interface InventoryFilters {
  search: string;
  category: string;
  location: string;
  status: "all" | "expired" | "soon" | "restock";
}

export interface PetFoodItem {
  id: string;
  manufacturer: string;
  productName: string;
  foodType?: string | null;
  packageType?: string | null;
  weight?: number | null;
  weightUnit?: string | null;
  quantity: number;
  minQty?: number | null;
  maxQty?: number | null;
  expiresAt?: string | null;
  addedAt?: string | null;
  notes?: string | null;
}

export interface InventoryItemCreate {
  ingredientKey?: string | null;
  name: string;
  baseName?: string | null;
  category?: string | null;
  location?: string | null;
  quantity: number;
  unit: string;
  minQty?: number | null;
  maxQty?: number | null;
  expiresAt?: string | null;
  notes?: string | null;
}

export type InventoryItemUpdate = Partial<InventoryItemCreate>;

export interface PetFoodItemCreate {
  manufacturer: string;
  productName: string;
  foodType?: string | null;
  packageType?: string | null;
  weight?: number | null;
  weightUnit?: string | null;
  quantity: number;
  minQty?: number | null;
  maxQty?: number | null;
  expiresAt?: string | null;
  notes?: string | null;
}

export type PetFoodItemUpdate = Partial<PetFoodItemCreate>;

export interface ConsumeRequest {
  amount: number;
}
