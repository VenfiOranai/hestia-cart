import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { buildApp } from "../app.js";
import { resetDb } from "./db.js";
import prisma from "../db.js";

const app = buildApp();

async function seedList() {
  const user = await prisma.user.create({
    data: { name: "Alice", color: "#4f46e5" },
  });
  const list = await prisma.list.create({
    data: { name: "L", shareToken: "tok-items" },
  });
  await prisma.listMember.create({ data: { userId: user.id, listId: list.id } });
  return { user, list };
}

describe("items", () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe("POST /api/lists/:listId/items", () => {
    it("creates an item", async () => {
      const { user, list } = await seedList();
      const res = await request(app)
        .post(`/api/lists/${list.id}/items`)
        .send({ name: "Milk", createdByUserId: user.id });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        name: "Milk",
        listId: list.id,
        createdByUserId: user.id,
        cartState: "needed",
      });
      expect(res.body.exclusions).toEqual([]);
      expect(res.body.createdBy.name).toBe("Alice");
    });

    it("trims whitespace and rejects an empty name", async () => {
      const { user, list } = await seedList();
      const res = await request(app)
        .post(`/api/lists/${list.id}/items`)
        .send({ name: "   ", createdByUserId: user.id });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/lists/:listId/items", () => {
    it("returns items in creation order", async () => {
      const { user, list } = await seedList();
      await prisma.item.create({
        data: { listId: list.id, name: "First", createdByUserId: user.id },
      });
      await prisma.item.create({
        data: { listId: list.id, name: "Second", createdByUserId: user.id },
      });
      const res = await request(app).get(`/api/lists/${list.id}/items`);
      expect(res.status).toBe(200);
      expect(res.body.map((i: { name: string }) => i.name)).toEqual([
        "First",
        "Second",
      ]);
    });
  });

  describe("PATCH /api/items/:id", () => {
    it("cycles the cartState", async () => {
      const { user, list } = await seedList();
      const item = await prisma.item.create({
        data: { listId: list.id, name: "Eggs", createdByUserId: user.id },
      });
      const res = await request(app)
        .patch(`/api/items/${item.id}`)
        .send({ cartState: "inCart" });
      expect(res.status).toBe(200);
      expect(res.body.cartState).toBe("inCart");
    });

    it("404s when the item doesn't exist", async () => {
      const res = await request(app)
        .patch("/api/items/999999")
        .send({ name: "x" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/items/:id", () => {
    it("deletes the item", async () => {
      const { user, list } = await seedList();
      const item = await prisma.item.create({
        data: { listId: list.id, name: "x", createdByUserId: user.id },
      });
      const res = await request(app).delete(`/api/items/${item.id}`);
      expect(res.status).toBe(204);
      expect(await prisma.item.findUnique({ where: { id: item.id } })).toBeNull();
    });
  });

  describe("exclusions", () => {
    it("adds and removes an exclusion", async () => {
      const { user, list } = await seedList();
      const other = await prisma.user.create({
        data: { name: "Bob", color: "#059669" },
      });
      const item = await prisma.item.create({
        data: { listId: list.id, name: "Milk", createdByUserId: user.id },
      });

      const add = await request(app)
        .post(`/api/items/${item.id}/exclusions`)
        .send({ userId: other.id });
      expect(add.status).toBe(201);

      expect(
        await prisma.itemExclusion.count({ where: { itemId: item.id } }),
      ).toBe(1);

      const remove = await request(app).delete(
        `/api/items/${item.id}/exclusions/${other.id}`,
      );
      expect(remove.status).toBe(204);

      expect(
        await prisma.itemExclusion.count({ where: { itemId: item.id } }),
      ).toBe(0);
    });

    it("404s when removing an exclusion that isn't there", async () => {
      const { user, list } = await seedList();
      const item = await prisma.item.create({
        data: { listId: list.id, name: "x", createdByUserId: user.id },
      });
      const res = await request(app).delete(
        `/api/items/${item.id}/exclusions/${user.id}`,
      );
      expect(res.status).toBe(404);
    });
  });
});
