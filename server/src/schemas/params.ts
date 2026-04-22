import { z } from "zod";

/** Positive-integer id from a URL path segment. */
const idSchema = z.coerce.number().int().positive();

/**
 * Parse and validate a numeric path parameter. Throws a `ZodError` (which the
 * error handler renders as `400 Validation error`) if the value isn't a
 * positive integer, so the route never has to deal with `NaN`.
 */
export function parseIdParam(value: string, name = "id"): number {
  const result = idSchema.safeParse(value);
  if (!result.success) {
    // Rewrap with a path so the 400 response points at the offending param.
    const err = new z.ZodError([
      {
        code: "custom",
        path: [name],
        message: `Invalid ${name}: must be a positive integer`,
      },
    ]);
    throw err;
  }
  return result.data;
}
