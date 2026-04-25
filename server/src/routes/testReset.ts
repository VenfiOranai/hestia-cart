import { Router } from "express";
import { resetDb } from "../test/db.js";

const router = Router();

// POST /api/_test/reset — wipe every table. Test-only; returns 404 in any
// other environment so production builds can't be coerced into truncating
// their own database.
router.post("/_test/reset", async (_req, res) => {
  if (process.env.NODE_ENV !== "test") {
    res.status(404).end();
    return;
  }
  await resetDb();
  res.status(204).end();
});

export default router;
