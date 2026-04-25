import { defineConfig, devices } from "@playwright/test";

/**
 * E2E stack runs on isolated ports so we don't collide with an active dev
 * server. The server workspace is started with `DATABASE_URL` pointing at a
 * dedicated SQLite file; `globalSetup` recreates that file fresh for each run.
 */
const SERVER_PORT = 3101;
const CLIENT_PORT = 5174;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 30_000,

  globalSetup: "./e2e/globalSetup.ts",

  use: {
    baseURL: `http://localhost:${CLIENT_PORT}`,
    trace: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: [
    {
      command: `cross-env NODE_ENV=test PORT=${SERVER_PORT} DATABASE_URL=file:./e2e.db npm run dev -w server`,
      port: SERVER_PORT,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      timeout: 60_000,
    },
    {
      command: `cross-env VITE_API_TARGET=http://localhost:${SERVER_PORT} npm run dev -w client -- --port ${CLIENT_PORT} --strictPort`,
      port: CLIENT_PORT,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      timeout: 60_000,
    },
  ],
});
