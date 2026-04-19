import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

// Express identifies error handlers by their 4-parameter signature
// (err, req, res, next). Even though we don't use `next` here, the
// parameter must be present for Express to recognise this as an error
// handler rather than a regular middleware.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Zod validation failure → 400
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation error",
      details: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  // Custom "not found" errors thrown from route handlers
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }

  // Anything else → 500
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};

/** Throw this from a route handler when a resource doesn't exist. */
export class NotFoundError extends Error {
  constructor(resource: string, id: number | string) {
    super(`${resource} ${id} not found`);
    this.name = "NotFoundError";
  }
}

export default errorHandler;
