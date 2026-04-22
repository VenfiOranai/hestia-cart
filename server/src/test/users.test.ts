import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { buildApp } from "../app.js";
import { resetDb } from "./db.js";
import prisma from "../db.js";

const app = buildApp();

describe("users", () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe("POST /api/users", () => {
    it("creates a user", async () => {
      const res = await request(app)
        .post("/api/users")
        .send({ name: "Alice", color: "#4f46e5" });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: "Alice", color: "#4f46e5" });
      expect(typeof res.body.id).toBe("number");
    });

    it("rejects an invalid hex color", async () => {
      const res = await request(app)
        .post("/api/users")
        .send({ name: "Alice", color: "red" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation error");
    });

    it("rejects an empty name", async () => {
      const res = await request(app)
        .post("/api/users")
        .send({ name: "   ", color: "#4f46e5" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/users/:id", () => {
    it("returns a user by id", async () => {
      const user = await prisma.user.create({
        data: { name: "Bob", color: "#059669" },
      });
      const res = await request(app).get(`/api/users/${user.id}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Bob");
    });

    it("404s when the user doesn't exist", async () => {
      const res = await request(app).get("/api/users/999999");
      expect(res.status).toBe(404);
    });

    it("400s on a non-numeric id", async () => {
      const res = await request(app).get("/api/users/abc");
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/users/:id/lists", () => {
    it("returns every list the user belongs to", async () => {
      const user = await prisma.user.create({
        data: { name: "Carol", color: "#d97706" },
      });
      const list = await prisma.list.create({
        data: { name: "Weekly", shareToken: "token-a" },
      });
      await prisma.listMember.create({
        data: { userId: user.id, listId: list.id },
      });

      const res = await request(app).get(`/api/users/${user.id}/lists`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: list.id,
        name: "Weekly",
        memberCount: 1,
        itemCount: 0,
      });
    });

    it("returns an empty array for a user with no memberships", async () => {
      const user = await prisma.user.create({
        data: { name: "Dave", color: "#4f46e5" },
      });
      const res = await request(app).get(`/api/users/${user.id}/lists`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
});
