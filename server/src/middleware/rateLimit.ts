import rateLimit from "express-rate-limit";

/**
 * Rate limit for creation endpoints (POST /users, POST /lists).
 *
 * These are the easiest to abuse (each call creates a row that's hard to
 * garbage-collect). Read/update endpoints aren't covered — they mutate
 * existing resources the caller already has a handle to.
 */
export const createResourceLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 10, // per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: "Too many requests — please slow down and try again shortly.",
    });
  },
});
