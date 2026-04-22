import { z } from "zod";
import { ListStatus } from "shared";

export const createListSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const updateListSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  status: z.nativeEnum(ListStatus).optional(),
});

export const addMemberSchema = z.object({
  userId: z.number().int().positive(),
});
