import type { CreatePurchaseBody, PurchaseWithDetails } from "shared";
import { request } from "./client";

export function createPurchase(listId: number, data: CreatePurchaseBody) {
  return request<PurchaseWithDetails>(`/api/lists/${listId}/purchases`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getPurchases(listId: number) {
  return request<PurchaseWithDetails[]>(`/api/lists/${listId}/purchases`);
}
