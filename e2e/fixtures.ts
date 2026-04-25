import { test as base } from "@playwright/test";
import { resetDb } from "./helpers/reset.js";

/**
 * Shared `test` export. Every spec should import `test` and `expect` from
 * here instead of `@playwright/test` so the auto-reset fixture runs before
 * each test and tests can't leak state into each other.
 */
export const test = base.extend<{ autoResetDb: void }>({
  autoResetDb: [
    async ({ request }, use) => {
      await resetDb(request);
      await use();
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
