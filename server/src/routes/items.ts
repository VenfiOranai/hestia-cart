import { Router } from "express";
import prisma from "../db.js";
import {
  createItemSchema,
  updateItemSchema,
  createExclusionSchema,
} from "../schemas/index.js";
import { NotFoundError } from "../middleware/errorHandler.js";

const router = Router();

// POST /api/lists/:listId/items — add an item
router.post("/lists/:listId/items", async (req, res) => {
  const listId = Number(req.params.listId);
  const data = createItemSchema.parse(req.body);

  const item = await prisma.item.create({
    data: { ...data, listId },
    include: { exclusions: true, createdBy: true },
  });
  res.status(201).json(item);
});

// GET /api/lists/:listId/items — list all items (include exclusions)
router.get("/lists/:listId/items", async (req, res) => {
  const listId = Number(req.params.listId);
  const items = await prisma.item.findMany({
    where: { listId },
    include: { exclusions: true, createdBy: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(items);
});

// PATCH /api/items/:id — update item name or cartState
router.patch("/items/:id", async (req, res) => {
  const id = Number(req.params.id);
  const data = updateItemSchema.parse(req.body);

  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Item", id);

  const item = await prisma.item.update({
    where: { id },
    data,
    include: { exclusions: true, createdBy: true },
  });
  res.json(item);
});

// DELETE /api/items/:id — delete an item
router.delete("/items/:id", async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Item", id);

  await prisma.item.delete({ where: { id } });
  res.status(204).end();
});

// --- Exclusions ---

// POST /api/items/:itemId/exclusions — exclude a user from an item
router.post("/items/:itemId/exclusions", async (req, res) => {
  const itemId = Number(req.params.itemId);
  const { userId } = createExclusionSchema.parse(req.body);

  const exclusion = await prisma.itemExclusion.create({
    data: { itemId, userId },
  });
  res.status(201).json(exclusion);
});

// DELETE /api/items/:itemId/exclusions/:userId — remove an exclusion
router.delete("/items/:itemId/exclusions/:userId", async (req, res) => {
  const itemId = Number(req.params.itemId);
  const userId = Number(req.params.userId);

  const existing = await prisma.itemExclusion.findUnique({
    where: { itemId_userId: { itemId, userId } },
  });
  if (!existing) throw new NotFoundError("ItemExclusion", `${itemId}/${userId}`);

  await prisma.itemExclusion.delete({
    where: { itemId_userId: { itemId, userId } },
  });
  res.status(204).end();
});

export default router;
