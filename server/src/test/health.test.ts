import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../app.js";

const app = buildApp();

describe("GET /api/health", () => {
  it("responds with ok and a timestamp", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.timestamp).toBe("string");
  });
});
