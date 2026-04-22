import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Vitest global setup — runs once before any test file. Recreates the test
 * SQLite database fresh so every run starts from a known-good schema.
 */
export default function setup(): void {
  const testDbPath = resolve(process.cwd(), "prisma", "test.db");
  if (existsSync(testDbPath)) unlinkSync(testDbPath);

  // `prisma db push` applies the schema without generating migrations.
  // We pass DATABASE_URL inline so the dev database is never touched.
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "inherit",
  });
}
