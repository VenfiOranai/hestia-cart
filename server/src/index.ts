import express from "express";
import cors from "cors";
import type { HealthResponse } from "shared";

const app = express();
const PORT = process.env.PORT ?? 3001;

// --- Middleware ---

// Parse JSON request bodies (needed once we add POST endpoints).
app.use(express.json());

// Allow requests from the Vite dev server (port 5173).
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

// --- Start ---

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
