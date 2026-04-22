import express, { type Express } from "express";
import cors from "cors";
import type { HealthResponse } from "shared";
import errorHandler from "./middleware/errorHandler.js";
import usersRouter from "./routes/users.js";
import listsRouter from "./routes/lists.js";
import itemsRouter from "./routes/items.js";
import purchasesRouter from "./routes/purchases.js";

export function buildApp(): Express {
  const app = express();

  app.use(express.json());

  app.use(
    cors({
      origin: "http://localhost:5173",
    }),
  );

  app.get("/api/health", (_req, res) => {
    const body: HealthResponse = {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
    res.json(body);
  });

  app.use("/api", usersRouter);
  app.use("/api", listsRouter);
  app.use("/api", itemsRouter);
  app.use("/api", purchasesRouter);

  app.use(errorHandler);

  return app;
}
