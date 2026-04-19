# Hestia Cart

Shared grocery list app — "Splitwise meets a notes app" for group grocery shopping. Create a list, share a link, and split costs fairly.

## Tech Stack

- **Frontend:** React (Vite, TypeScript, Tailwind CSS)
- **Backend:** Node + Express (TypeScript), Zod for validation
- **Database:** SQLite (local dev) via Prisma ORM, designed to migrate to Postgres
- **Monorepo:** npm workspaces — `client/`, `server/`, `shared/`

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm (v7+ for workspace support)

### Setup

```bash
# Install all dependencies (root, client, server, shared)
npm install

# Run the initial database migration
npm run db:migrate -w server

# Seed the database with test data
npm run db:seed -w server
```

### Running

```bash
# Start both dev servers (Express on :3001, Vite on :5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — you should see the health check response from the server.

## Commands

All commands run from the project root.

| Command | Description |
|---|---|
| `npm run dev` | Start both client and server in dev mode |
| `npm run db:migrate -w server` | Run pending Prisma migrations |
| `npm run db:seed -w server` | Seed the database with test data |
| `npm run db:studio -w server` | Open Prisma Studio (visual DB browser) |

## Project Structure

```
hestia-cart/
├── package.json            # Workspace root, shared scripts
├── tsconfig.base.json      # Base TypeScript config
├── shared/                 # Shared TypeScript types (imported by client + server)
│   └── src/index.ts
├── server/
│   ├── src/index.ts        # Express entry point
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   ├── seed.ts         # Test data seeder
│   │   └── migrations/     # Generated SQL migrations
│   └── prisma.config.ts    # Prisma config (seed command, schema path)
└── client/
    ├── vite.config.ts      # Vite config (API proxy to Express)
    ├── tailwind.config.js
    └── src/
        ├── main.tsx        # React entry point
        └── App.tsx         # Main app component
```

## Database Schema

All tables use autoincrement integer IDs. `List` has an additional `shareToken` (random string) for share URLs.

- **User** — name, color (hex for avatar)
- **List** — name, status (open/closed), shareToken
- **ListMember** — links users to lists
- **Item** — name, cartState (needed/in_cart/purchased), belongs to a list
- **ItemExclusion** — marks a user as excluded from splitting an item (no row = included by default)
- **Purchase** — a checkout event, tracks who paid
- **PurchaseItem** — line items in a purchase, price stored as integer cents

Money is always stored as integer cents — never floats.