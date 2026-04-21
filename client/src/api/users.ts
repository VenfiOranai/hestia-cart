import type { CreateUserBody, ListSummary, User } from "shared";
import { request } from "./client";

export function createUser(data: CreateUserBody) {
  return request<User>("/api/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getUser(id: number) {
  return request<User>(`/api/users/${id}`);
}

export function getUserLists(userId: number) {
  return request<ListSummary[]>(`/api/users/${userId}/lists`);
}
