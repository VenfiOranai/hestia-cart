import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { buildApp } from "../app.js";
import { resetDb } from "./db.js";
import prisma from "../db.js";

const app = buildApp();

async function threeMemberList() {
  const alice = await prisma.user.create({
    data: { name: "Alice", color: "#4f46e5" },
  });
  const bob = await prisma.user.create({
    data: { name: "Bob", color: "#059669" },
  });
  const carol = await prisma.user.create({
    data: { name: "Carol", color: "#d97706" },
  });
  const list = await prisma.list.create({
    data: { name: "L", shareToken: "tok-purchases" },
  });
  for (const u of [alice, bob, carol]) {
    await prisma.listMember.create({
      data: { userId: u.id, listId: list.id },
    });
  }
  return { alice, bob, carol, list };
}

describe("purchases", () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe("POST /api/lists/:listId/purchases", () => {
    it("creates a purchase with its line items in one transaction", async () => {
      const { alice, list } = await threeMemberList();
      const milk = await prisma.item.create({
        data: { listId: list.id, name: "Milk", createdByUserId: alice.id },
      });
      const bread = await prisma.item.create({
        data: { listId: list.id, name: "Bread", createdByUserId: alice.id },
      });

      const res = await request(app)
        .post(`/api/lists/${list.id}/purchases`)
        .send({
          payerUserId: alice.id,
          items: [
            { itemId: milk.id, priceCents: 500 },
            { itemId: bread.id, priceCents: 300 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.payerUserId).toBe(alice.id);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.payer.name).toBe("Alice");
    });

    it("requires at least one item", async () => {
      const { alice, list } = await threeMemberList();
      const res = await request(app)
        .post(`/api/lists/${list.id}/purchases`)
        .send({ payerUserId: alice.id, items: [] });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/lists/:listId/splits", () => {
    it("splits evenly across all three members", async () => {
      const { alice, bob, carol, list } = await threeMemberList();
      const eggs = await prisma.item.create({
        data: { listId: list.id, name: "Eggs", createdByUserId: alice.id },
      });
      await prisma.purchase.create({
        data: {
          listId: list.id,
          payerUserId: alice.id,
          items: { create: [{ itemId: eggs.id, priceCents: 900 }] },
        },
      });

      const res = await request(app).get(`/api/lists/${list.id}/splits`);
      expect(res.status).toBe(200);
      expect(res.body.totalCents).toBe(900);
      expect(res.body.debts).toHaveLength(2);

      const entries = new Map(
        res.body.debts.map((d: { from: { id: number }; to: { id: number }; amountCents: number }) => [
          d.from.id,
          { toId: d.to.id, amount: d.amountCents },
        ]),
      );
      expect(entries.get(bob.id)).toEqual({ toId: alice.id, amount: 300 });
      expect(entries.get(carol.id)).toEqual({ toId: alice.id, amount: 300 });
    });

    it("respects exclusions", async () => {
      const { alice, bob, carol, list } = await threeMemberList();
      const milk = await prisma.item.create({
        data: { listId: list.id, name: "Milk", createdByUserId: alice.id },
      });
      // Carol is lactose intolerant — exclude her.
      await prisma.itemExclusion.create({
        data: { itemId: milk.id, userId: carol.id },
      });
      await prisma.purchase.create({
        data: {
          listId: list.id,
          payerUserId: alice.id,
          items: { create: [{ itemId: milk.id, priceCents: 600 }] },
        },
      });

      const res = await request(app).get(`/api/lists/${list.id}/splits`);
      expect(res.status).toBe(200);
      // Split between Alice + Bob only (300 each). Bob owes Alice 300.
      expect(res.body.debts).toHaveLength(1);
      expect(res.body.debts[0]).toMatchObject({
        from: { id: bob.id },
        to: { id: alice.id },
        amountCents: 300,
      });
    });

    it("nets mutual debts so A and B don't both show as owing each other", async () => {
      const { alice, bob, list } = await threeMemberList();
      const a = await prisma.item.create({
        data: { listId: list.id, name: "A", createdByUserId: alice.id },
      });
      const b = await prisma.item.create({
        data: { listId: list.id, name: "B", createdByUserId: alice.id },
      });

      // Alice pays for A — Bob owes Alice half.
      await prisma.purchase.create({
        data: {
          listId: list.id,
          payerUserId: alice.id,
          items: { create: [{ itemId: a.id, priceCents: 1000 }] },
        },
      });
      // Bob pays for B — Alice owes Bob half.
      await prisma.purchase.create({
        data: {
          listId: list.id,
          payerUserId: bob.id,
          items: { create: [{ itemId: b.id, priceCents: 400 }] },
        },
      });

      const res = await request(app).get(`/api/lists/${list.id}/splits`);
      expect(res.status).toBe(200);

      // Per-item split is three ways with the remainder going to the first
      // included member (Alice). On item A (1000): Alice's share 334, Bob owes
      // Alice 333, Carol owes Alice 333. On item B (400): Alice's share 134,
      // so Alice owes Bob 134, Carol owes Bob 133. Net Bob→Alice: 333-134=199.
      const bobToAlice = res.body.debts.find(
        (d: { from: { id: number }; to: { id: number } }) =>
          d.from.id === bob.id && d.to.id === alice.id,
      );
      expect(bobToAlice).toBeDefined();
      expect(bobToAlice.amountCents).toBe(199);

      // And Alice should NOT appear as owing Bob anything — it's netted.
      const aliceToBob = res.body.debts.find(
        (d: { from: { id: number }; to: { id: number } }) =>
          d.from.id === alice.id && d.to.id === bob.id,
      );
      expect(aliceToBob).toBeUndefined();
    });
  });
});
