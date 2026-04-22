import { Router } from "express";
import prisma from "../db.js";
import { createUserSchema, parseIdParam } from "../schemas/index.js";
import { NotFoundError } from "../middleware/errorHandler.js";
import { createResourceLimiter } from "../middleware/rateLimit.js";

const router = Router();

// POST /api/users — create a user
router.post("/users", createResourceLimiter, async (req, res) => {
  const data = createUserSchema.parse(req.body);
  const user = await prisma.user.create({ data });
  res.status(201).json(user);
});

// GET /api/users/:id — get a user by ID
router.get("/users/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError("User", id);
  res.json(user);
});

// GET /api/users/:id/lists — get all lists this user belongs to
router.get("/users/:id/lists", async (req, res) => {
  const userId = parseIdParam(req.params.id);

  const memberships = await prisma.listMember.findMany({
    where: { userId },
    include: {
      list: {
        include: {
          _count: { select: { members: true, items: true } },
        },
      },
    },
    orderBy: { list: { updatedAt: "desc" } },
  });

  const lists = memberships.map((m) => ({
    ...m.list,
    memberCount: m.list._count.members,
    itemCount: m.list._count.items,
  }));

  res.json(lists);
});

export default router;
