import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Before the Playwright suite starts, wipe and recreate the E2E SQLite file
 * so every run begins with an empty database.
 *
 * The server itself is spawned by Playwright's `webServer` with
 * `DATABASE_URL=file:./e2e.db` — this just makes sure the schema is applied
 * to that file before any request hits it.
 */
export default function globalSetup(): void {
  const serverDir = resolve(process.cwd(), "server");
  const dbPath = resolve(serverDir, "prisma", "e2e.db");
  if (existsSync(dbPath)) unlinkSync(dbPath);

  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: "file:./e2e.db" },
    stdio: "inherit",
  });
}
