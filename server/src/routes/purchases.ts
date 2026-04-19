import { Router } from "express";
import prisma from "../db.js";
import { createPurchaseSchema } from "../schemas/index.js";

const router = Router();

// POST /api/lists/:listId/purchases — create a purchase with items
router.post("/lists/:listId/purchases", async (req, res) => {
  const listId = Number(req.params.listId);
  const { payerUserId, items } = createPurchaseSchema.parse(req.body);

  // Create the purchase and all its line items in a single transaction.
  // Prisma's nested `create` does this automatically — if any part fails,
  // the whole thing rolls back.
  const purchase = await prisma.purchase.create({
    data: {
      listId,
      payerUserId,
      items: {
        create: items,
      },
    },
    include: {
      items: { include: { item: true } },
      payer: true,
    },
  });

  res.status(201).json(purchase);
});

// GET /api/lists/:listId/purchases — list all purchases for a list
router.get("/lists/:listId/purchases", async (req, res) => {
  const listId = Number(req.params.listId);
  const purchases = await prisma.purchase.findMany({
    where: { listId },
    include: {
      items: { include: { item: true } },
      payer: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(purchases);
});

export default router;
