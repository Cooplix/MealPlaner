import { API_ROOT, UnauthorizedError, api } from "../../api";
import type {
  ConsumeRequest,
  InventoryEvent,
  InventoryItem,
  InventoryItemCreate,
  InventoryItemUpdate,
  PetFoodItem,
  PetFoodItemCreate,
  PetFoodItemUpdate,
} from "./types";

type RequestOptions = Omit<RequestInit, "headers"> & { headers?: Record<string, string> };

async function request<T>(path: string, init?: RequestOptions, includeAuth = true): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers ?? {}),
  };
  if (includeAuth) {
    const token = api.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
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

export const inventoryApi = {
  listItems(): Promise<InventoryItem[]> {
    return request<InventoryItem[]>("/inventory");
  },
  getItem(id: string): Promise<InventoryItem> {
    return request<InventoryItem>(`/inventory/${encodeURIComponent(id)}`);
  },
  createItem(payload: InventoryItemCreate): Promise<InventoryItem> {
    return request<InventoryItem>("/inventory", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateItem(id: string, payload: InventoryItemUpdate): Promise<InventoryItem> {
    return request<InventoryItem>(`/inventory/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteItem(id: string): Promise<void> {
    return request<void>(`/inventory/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  consumeItem(id: string, payload: ConsumeRequest): Promise<InventoryItem> {
    return request<InventoryItem>(`/inventory/${encodeURIComponent(id)}/consume`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  listPetItems(): Promise<PetFoodItem[]> {
    return request<PetFoodItem[]>("/pet-inventory");
  },
  getPetItem(id: string): Promise<PetFoodItem> {
    return request<PetFoodItem>(`/pet-inventory/${encodeURIComponent(id)}`);
  },
  createPetItem(payload: PetFoodItemCreate): Promise<PetFoodItem> {
    return request<PetFoodItem>("/pet-inventory", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updatePetItem(id: string, payload: PetFoodItemUpdate): Promise<PetFoodItem> {
    return request<PetFoodItem>(`/pet-inventory/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deletePetItem(id: string): Promise<void> {
    return request<void>(`/pet-inventory/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  consumePetItem(id: string, payload: ConsumeRequest): Promise<PetFoodItem> {
    return request<PetFoodItem>(`/pet-inventory/${encodeURIComponent(id)}/consume`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  listEvents(params?: { limit?: number; lookaheadDays?: number }): Promise<InventoryEvent[]> {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.lookaheadDays) query.set("lookaheadDays", String(params.lookaheadDays));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<InventoryEvent[]>(`/events${suffix}`);
  },
};
