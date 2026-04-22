import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./src/test/globalSetup.ts"],
    env: {
      // Point Prisma at a dedicated test SQLite file so nothing ever touches
      // the dev database.
      DATABASE_URL: "file:./test.db",
    },
    // Prisma + SQLite serialize writes at the file level; running tests in
    // parallel means occasional "database is locked" flakes. Forcing a single
    // worker keeps the suite deterministic (and it's still fast).
    fileParallelism: false,
    include: ["src/**/*.test.ts"],
  },
});
