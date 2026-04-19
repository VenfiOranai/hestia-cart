import type {
  CreateExclusionBody,
  CreateItemBody,
  ItemExclusion,
  ItemWithDetails,
  UpdateItemBody,
} from "shared";
import { request } from "./client";

export function getItems(listId: number) {
  return request<ItemWithDetails[]>(`/api/lists/${listId}/items`);
}

export function createItem(listId: number, data: CreateItemBody) {
  return request<ItemWithDetails>(`/api/lists/${listId}/items`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateItem(id: number, data: UpdateItemBody) {
  return request<ItemWithDetails>(`/api/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteItem(id: number) {
  return request<void>(`/api/items/${id}`, { method: "DELETE" });
}

// ---- Exclusions ----

export function addExclusion(itemId: number, data: CreateExclusionBody) {
  return request<ItemExclusion>(`/api/items/${itemId}/exclusions`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function removeExclusion(itemId: number, userId: number) {
  return request<void>(`/api/items/${itemId}/exclusions/${userId}`, {
    method: "DELETE",
  });
}
