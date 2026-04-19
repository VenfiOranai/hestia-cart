import { z } from "zod";

const purchaseItemSchema = z.object({
  itemId: z.number().int().positive(),
  priceCents: z.number().int().nonnegative(),
});

export const createPurchaseSchema = z.object({
  payerUserId: z.number().int().positive(),
  items: z.array(purchaseItemSchema).min(1),
});
