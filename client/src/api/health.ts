import type { HealthResponse } from "shared";
import { request } from "./client";

export function getHealth() {
  return request<HealthResponse>("/api/health");
}
