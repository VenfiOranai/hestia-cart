import { Router } from "express";
import { createId } from "@paralleldrive/cuid2";
import prisma from "../db.js";
import {
  createListSchema,
  updateListSchema,
} from "../schemas/index.js";
import { NotFoundError } from "../middleware/errorHandler.js";
import { broadcast } from "../ws.js";

const router = Router();

// POST /api/lists — create a list
// Requires `creatorUserId` in the body so we can auto-add them as a member.
router.post("/lists", async (req, res) => {
  const { name } = createListSchema.parse(req.body);

  const list = await prisma.list.create({
    data: {
      name,
      shareToken: createId(),
    },
  });

  res.status(201).json(list);
});

// GET /api/lists/join/:shareToken — look up a list by its share token
// Defined before /lists/:id so Express doesn't treat "join" as an :id.
router.get("/lists/join/:shareToken", async (req, res) => {
  const list = await prisma.list.findUnique({
    where: { shareToken: req.params.shareToken },
    include: {
      members: { include: { user: true } },
      items: { include: { exclusions: true, createdBy: true } },
    },
  });
  if (!list) throw new NotFoundError("List", req.params.shareToken);
  res.json(list);
});

// GET /api/lists/:id — get a list with members and items
router.get("/lists/:id", async (req, res) => {
  const id = Number(req.params.id);
  const list = await prisma.list.findUnique({
    where: { id },
    include: {
      members: { include: { user: true } },
      items: {
        include: { exclusions: true, createdBy: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!list) throw new NotFoundError("List", id);
  res.json(list);
});

// PATCH /api/lists/:id — update list name or status
router.patch("/lists/:id", async (req, res) => {
  const id = Number(req.params.id);
  const data = updateListSchema.parse(req.body);

  // Ensure the list exists before updating.
  const existing = await prisma.list.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("List", id);

  const list = await prisma.list.update({ where: { id }, data });
  res.json(list);
});

// DELETE /api/lists/:id — delete a list (cascades)
router.delete("/lists/:id", async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.list.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("List", id);

  await prisma.list.delete({ where: { id } });
  res.status(204).end();
});

// --- Members ---

// GET /api/lists/:listId/members — list all members
router.get("/lists/:listId/members", async (req, res) => {
  const listId = Number(req.params.listId);
  const members = await prisma.listMember.findMany({
    where: { listId },
    include: { user: true },
  });
  res.json(members);
});

// POST /api/lists/:listId/members — add a user to a list
router.post("/lists/:listId/members", async (req, res) => {
  const listId = Number(req.params.listId);
  const { userId } = req.body as { userId: number };

  const member = await prisma.listMember.create({
    data: { userId, listId },
    include: { user: true },
  });
  broadcast(listId, { type: "member:joined", payload: member });
  res.status(201).json(member);
});

// DELETE /api/lists/:listId/members/:userId — remove a user from a list
router.delete("/lists/:listId/members/:userId", async (req, res) => {
  const listId = Number(req.params.listId);
  const userId = Number(req.params.userId);

  const existing = await prisma.listMember.findUnique({
    where: { userId_listId: { userId, listId } },
  });
  if (!existing) throw new NotFoundError("ListMember", `${userId}/${listId}`);

  await prisma.listMember.delete({
    where: { userId_listId: { userId, listId } },
  });
  broadcast(listId, { type: "member:left", payload: { userId } });
  res.status(204).end();
});

export default router;
