import { Router } from "express";

const router = Router();

// POST   /api/lists                    — create a list
// GET    /api/lists/:id                — get a list with members and items
// PATCH  /api/lists/:id                — update list name or status
// DELETE /api/lists/:id                — delete a list
// GET    /api/lists/join/:shareToken   — look up a list by share token
// POST   /api/lists/:listId/members    — add a member
// DELETE /api/lists/:listId/members/:userId — remove a member
// GET    /api/lists/:listId/members    — list all members

export default router;
