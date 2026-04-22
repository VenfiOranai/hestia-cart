import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { buildApp } from "../app.js";
import { resetDb } from "./db.js";
import prisma from "../db.js";

const app = buildApp();

describe("lists", () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe("POST /api/lists", () => {
    it("creates a list with an auto-generated shareToken", async () => {
      const res = await request(app)
        .post("/api/lists")
        .send({ name: "Weekly groceries" });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Weekly groceries");
      expect(res.body.shareToken).toMatch(/^[a-z0-9]+$/);
      expect(res.body.status).toBe("open");
    });

    it("rejects an empty name", async () => {
      const res = await request(app).post("/api/lists").send({ name: "" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/lists/:id", () => {
    it("returns a list with members and items", async () => {
      const user = await prisma.user.create({
        data: { name: "A", color: "#4f46e5" },
      });
      const list = await prisma.list.create({
        data: { name: "L", shareToken: "tok1" },
      });
      await prisma.listMember.create({
        data: { userId: user.id, listId: list.id },
      });
      await prisma.item.create({
        data: { listId: list.id, name: "Milk", createdByUserId: user.id },
      });

      const res = await request(app).get(`/api/lists/${list.id}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("L");
      expect(res.body.members).toHaveLength(1);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].name).toBe("Milk");
    });

    it("404s for a missing list", async () => {
      const res = await request(app).get("/api/lists/999999");
      expect(res.status).toBe(404);
    });

    it("400s on a non-numeric id", async () => {
      const res = await request(app).get("/api/lists/foo");
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/lists/join/:shareToken", () => {
    it("looks up a list by its share token", async () => {
      const list = await prisma.list.create({
        data: { name: "Shared", shareToken: "shared-tok-1" },
      });
      const res = await request(app).get("/api/lists/join/shared-tok-1");
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(list.id);
      expect(res.body.members).toEqual([]);
    });

    it("404s for an unknown share token", async () => {
      const res = await request(app).get("/api/lists/join/nope");
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/lists/:id", () => {
    it("updates the name", async () => {
      const list = await prisma.list.create({
        data: { name: "Old", shareToken: "tok-p" },
      });
      const res = await request(app)
        .patch(`/api/lists/${list.id}`)
        .send({ name: "New" });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("New");
    });

    it("updates the status to closed", async () => {
      const list = await prisma.list.create({
        data: { name: "L", shareToken: "tok-p2" },
      });
      const res = await request(app)
        .patch(`/api/lists/${list.id}`)
        .send({ status: "closed" });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("closed");
    });

    it("rejects an unknown status value", async () => {
      const list = await prisma.list.create({
        data: { name: "L", shareToken: "tok-p3" },
      });
      const res = await request(app)
        .patch(`/api/lists/${list.id}`)
        .send({ status: "archived" });
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/lists/:id", () => {
    it("cascades to items and members", async () => {
      const user = await prisma.user.create({
        data: { name: "A", color: "#4f46e5" },
      });
      const list = await prisma.list.create({
        data: { name: "L", shareToken: "tok-d" },
      });
      await prisma.listMember.create({
        data: { userId: user.id, listId: list.id },
      });
      await prisma.item.create({
        data: { listId: list.id, name: "x", createdByUserId: user.id },
      });

      const res = await request(app).delete(`/api/lists/${list.id}`);
      expect(res.status).toBe(204);

      expect(await prisma.list.findUnique({ where: { id: list.id } })).toBeNull();
      expect(await prisma.item.count({ where: { listId: list.id } })).toBe(0);
      expect(await prisma.listMember.count({ where: { listId: list.id } })).toBe(0);
    });

    it("404s when the list doesn't exist", async () => {
      const res = await request(app).delete("/api/lists/999999");
      expect(res.status).toBe(404);
    });
  });

  describe("members", () => {
    async function fixture() {
      const user = await prisma.user.create({
        data: { name: "M", color: "#4f46e5" },
      });
      const list = await prisma.list.create({
        data: { name: "L", shareToken: "tok-m" },
      });
      return { user, list };
    }

    it("adds a user to a list", async () => {
      const { user, list } = await fixture();
      const res = await request(app)
        .post(`/api/lists/${list.id}/members`)
        .send({ userId: user.id });
      expect(res.status).toBe(201);
      expect(res.body.userId).toBe(user.id);
      expect(res.body.listId).toBe(list.id);
      expect(res.body.user.name).toBe("M");
    });

    it("rejects a non-numeric userId body", async () => {
      const { list } = await fixture();
      const res = await request(app)
        .post(`/api/lists/${list.id}/members`)
        .send({ userId: "not-a-number" });
      expect(res.status).toBe(400);
    });

    it("removes a user from a list", async () => {
      const { user, list } = await fixture();
      await prisma.listMember.create({
        data: { userId: user.id, listId: list.id },
      });
      const res = await request(app).delete(
        `/api/lists/${list.id}/members/${user.id}`,
      );
      expect(res.status).toBe(204);
      expect(await prisma.listMember.count({ where: { listId: list.id } })).toBe(0);
    });

    it("404s when removing a non-member", async () => {
      const { user, list } = await fixture();
      const res = await request(app).delete(
        `/api/lists/${list.id}/members/${user.id}`,
      );
      expect(res.status).toBe(404);
    });
  });
});
