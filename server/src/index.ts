import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import type { HealthResponse } from "shared";
import errorHandler from "./middleware/errorHandler.js";
import usersRouter from "./routes/users.js";
import listsRouter from "./routes/lists.js";
import itemsRouter from "./routes/items.js";
import purchasesRouter from "./routes/purchases.js";
import { attachWebSocketServer } from "./ws.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

// --- Middleware ---

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

// --- Routes ---

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

// --- Error handling (must be registered after routes) ---

app.use(errorHandler);

// --- Start ---
// Create a raw HTTP server so we can attach the WebSocket server to the same port.

const httpServer = createServer(app);
attachWebSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws?listId=...`);
});
