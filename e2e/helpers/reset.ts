import type { APIRequestContext } from "@playwright/test";

/**
 * Reset every row in the E2E SQLite database. Routed through the client's
 * Vite proxy so we don't have to know the server port here.
 */
export async function resetDb(request: APIRequestContext): Promise<void> {
  const res = await request.post("/api/_test/reset");
  if (!res.ok()) {
    throw new Error(
      `resetDb failed: ${res.status()} ${res.statusText()} — is NODE_ENV=test set on the server?`,
    );
  }
}
