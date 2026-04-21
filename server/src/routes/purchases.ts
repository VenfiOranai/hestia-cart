import { Router } from "express";
import prisma from "../db.js";
import { createPurchaseSchema } from "../schemas/index.js";
import { NotFoundError } from "../middleware/errorHandler.js";

const router = Router();

// POST /api/lists/:listId/purchases — create a purchase with items
router.post("/lists/:listId/purchases", async (req, res) => {
  const listId = Number(req.params.listId);
  const { payerUserId, items } = createPurchaseSchema.parse(req.body);

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

// GET /api/lists/:listId/splits — calculate who owes whom
//
// For each purchase item:
//   1. Start with all list members
//   2. Remove excluded users (ItemExclusion rows)
//   3. Split priceCents equally among remaining users
//   4. Each non-payer's share is what they owe the payer
//
// Then aggregate across all purchases and simplify debts
// (if A owes B $5 and B owes A $3, net result is A owes B $2).
router.get("/lists/:listId/splits", async (req, res) => {
  const listId = Number(req.params.listId);

  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: {
      members: { include: { user: true } },
    },
  });
  if (!list) throw new NotFoundError("List", listId);

  const purchases = await prisma.purchase.findMany({
    where: { listId },
    include: {
      items: {
        include: {
          item: { include: { exclusions: true } },
        },
      },
    },
  });

  const memberIds = list.members.map((m) => m.userId);

  // Track net balances: balances[debtor][creditor] = amount in cents
  // Positive means debtor owes creditor.
  const balances = new Map<number, Map<number, number>>();

  function addDebt(debtor: number, creditor: number, amount: number) {
    if (debtor === creditor || amount === 0) return;
    if (!balances.has(debtor)) balances.set(debtor, new Map());
    const row = balances.get(debtor)!;
    row.set(creditor, (row.get(creditor) ?? 0) + amount);
  }

  for (const purchase of purchases) {
    const payerId = purchase.payerUserId;

    for (const pi of purchase.items) {
      const excludedIds = new Set(pi.item.exclusions.map((e) => e.userId));
      const includedIds = memberIds.filter((id) => !excludedIds.has(id));

      if (includedIds.length === 0) continue;

      // Integer division: spread evenly, remainder goes to first included member.
      const perPerson = Math.floor(pi.priceCents / includedIds.length);
      const remainder = pi.priceCents % includedIds.length;

      for (let i = 0; i < includedIds.length; i++) {
        const memberId = includedIds[i];
        const share = perPerson + (i < remainder ? 1 : 0);
        // This member owes the payer their share.
        addDebt(memberId, payerId, share);
      }
    }
  }

  // Simplify: net out mutual debts.
  // Build a simplified list of { from, to, amountCents }.
  const debts: { fromUserId: number; toUserId: number; amountCents: number }[] = [];

  const processed = new Set<string>();
  for (const [debtor, creditors] of balances) {
    for (const [creditor, amount] of creditors) {
      const key = [Math.min(debtor, creditor), Math.max(debtor, creditor)].join(",");
      if (processed.has(key)) continue;
      processed.add(key);

      const forward = amount; // debtor owes creditor
      const reverse = balances.get(creditor)?.get(debtor) ?? 0; // creditor owes debtor
      const net = forward - reverse;

      if (net > 0) {
        debts.push({ fromUserId: debtor, toUserId: creditor, amountCents: net });
      } else if (net < 0) {
        debts.push({ fromUserId: creditor, toUserId: debtor, amountCents: -net });
      }
    }
  }

  // Build a userId → User map for the response.
  const usersById = Object.fromEntries(
    list.members.map((m) => [m.userId, m.user])
  );

  res.json({
    debts: debts.map((d) => ({
      from: usersById[d.fromUserId],
      to: usersById[d.toUserId],
      amountCents: d.amountCents,
    })),
    totalCents: purchases.reduce(
      (sum, p) => sum + p.items.reduce((s, pi) => s + pi.priceCents, 0),
      0
    ),
  });
});

export default router;
