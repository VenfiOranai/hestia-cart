import { PrismaClient } from "@prisma/client";

// Single shared instance — avoids opening multiple database connections.
// In dev, tsx watch restarts the process on file changes, so there's no
// risk of leaking clients across hot reloads (unlike Next.js, where you'd
// need to stash the client on `globalThis`).
const prisma = new PrismaClient();

export default prisma;
