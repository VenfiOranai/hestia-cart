import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { buildApp } from "../app.js";
import prisma from "../db.js";

const app = buildApp();

describe("POST /api/_test/reset", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("returns 204 and wipes every table when NODE_ENV=test", async () => {
    process.env.NODE_ENV = "test";

    await prisma.user.create({ data: { name: "Alice", color: "#4f46e5" } });
    await prisma.list.create({ data: { name: "Weekly", shareToken: "tok-1" } });

    const res = await request(app).post("/api/_test/reset");
    expect(res.status).toBe(204);

    const userCount = await prisma.user.count();
    const listCount = await prisma.list.count();
    expect(userCount).toBe(0);
    expect(listCount).toBe(0);
  });

  it("returns 404 when NODE_ENV is not test", async () => {
    process.env.NODE_ENV = "production";

    const user = await prisma.user.create({
      data: { name: "Bob", color: "#059669" },
    });

    const res = await request(app).post("/api/_test/reset");
    expect(res.status).toBe(404);

    // Row must still be there.
    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found).not.toBeNull();
  });
});
