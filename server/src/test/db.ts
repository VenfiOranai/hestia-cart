import prisma from "../db.js";

/**
 * Delete every row in every table. Called in `beforeEach` so each test sees
 * an empty database. Order matters: children first so FK cascades don't fight
 * with Prisma's own FK checks on SQLite.
 */
export async function resetDb(): Promise<void> {
  await prisma.$transaction([
    prisma.purchaseItem.deleteMany(),
    prisma.purchase.deleteMany(),
    prisma.itemExclusion.deleteMany(),
    prisma.item.deleteMany(),
    prisma.listMember.deleteMany(),
    prisma.list.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
