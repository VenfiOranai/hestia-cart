import type {
  CreateListBody,
  List,
  ListMemberWithUser,
  ListWithDetails,
  UpdateListBody,
} from "shared";
import { request } from "./client";

export function createList(data: CreateListBody) {
  return request<List>("/api/lists", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getList(id: number) {
  return request<ListWithDetails>(`/api/lists/${id}`);
}

export function updateList(id: number, data: UpdateListBody) {
  return request<List>(`/api/lists/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteList(id: number) {
  return request<void>(`/api/lists/${id}`, { method: "DELETE" });
}

export function getListByShareToken(shareToken: string) {
  return request<ListWithDetails>(`/api/lists/join/${shareToken}`);
}

// ---- Members ----

export function getMembers(listId: number) {
  return request<ListMemberWithUser[]>(`/api/lists/${listId}/members`);
}

export function addMember(listId: number, userId: number) {
  return request<ListMemberWithUser>(`/api/lists/${listId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export function removeMember(listId: number, userId: number) {
  return request<void>(`/api/lists/${listId}/members/${userId}`, {
    method: "DELETE",
  });
}
