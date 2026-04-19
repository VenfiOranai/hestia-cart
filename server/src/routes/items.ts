import { Router } from "express";

const router = Router();

// POST   /api/lists/:listId/items       — add an item
// GET    /api/lists/:listId/items       — list all items (include exclusions)
// PATCH  /api/items/:id                 — update item name or cartState
// DELETE /api/items/:id                 — delete an item
// POST   /api/items/:itemId/exclusions  — exclude a user from an item
// DELETE /api/items/:itemId/exclusions/:userId — remove an exclusion

export default router;
