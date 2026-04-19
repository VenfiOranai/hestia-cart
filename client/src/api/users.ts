import type { CreateUserBody, User } from "shared";
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
