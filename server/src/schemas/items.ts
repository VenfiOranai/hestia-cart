import { z } from "zod";
import { CartState } from "shared";

export const createItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  createdByUserId: z.number().int().positive(),
});

export const updateItemSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  cartState: z.nativeEnum(CartState).optional(),
});

export const createExclusionSchema = z.object({
  userId: z.number().int().positive(),
});
