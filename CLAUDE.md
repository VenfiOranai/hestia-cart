# Hestia Cart

Shared grocery list app — "Splitwise meets a notes app" for group grocery shopping. Create a list, share a link, shop together, split costs fairly.

## Tech Stack

- **Monorepo** via npm workspaces: `client/`, `server/`, `shared/`
- **Client**: React 19, Vite, TypeScript, Tailwind CSS 3, React Router
- **Server**: Express 5, TypeScript, Zod validation, `tsx watch` for dev
- **Database**: SQLite (local dev) via Prisma ORM — schema designed for Postgres migration
- **Shared**: TypeScript enums and interfaces imported by both client and server

## Project Structure

```
client/                    # React frontend (Vite on :5173)
  src/App.tsx              # BrowserRouter with routes
  src/api/                 # Typed API client (split per resource)
    client.ts              # Fetch wrapper (request<T>()) + ApiRequestError
    index.ts               # Barrel re-exports
    health.ts, users.ts, lists.ts, items.ts, purchases.ts
  src/components/
    Layout.tsx             # Header + Outlet, mobile-first (max-w-lg)
    AddItemForm.tsx        # Text input to add item; delegates creation via onSubmit(name)
    ItemRow.tsx            # Item with state cycling, delete, exclusion badges; optimistic updates
    ExclusionModal.tsx     # Bottom-sheet modal to toggle member exclusions per item
    ShareButton.tsx        # Copy share URL to clipboard
    MemberList.tsx         # Colored member badges, leave button
    CheckoutModal.tsx      # Record a purchase: select items, enter prices, pick payer
    SplitsCard.tsx         # Display who owes whom after purchases are recorded
    Toast.tsx              # ToastProvider + useToast hook (success/error/info, auto-dismiss)
    Skeleton.tsx           # Skeleton + page skeletons (ListPageSkeleton, JoinPageSkeleton, MyListsSkeleton)
  src/pages/
    HomePage.tsx           # Create a new list
    ListPage.tsx           # Main list view: grouped items, add form, members, share
    JoinPage.tsx           # Join via share link (name + color picker)
  src/main.tsx             # Entry point
  vite.config.ts           # Proxy /api/* → localhost:3001
server/                    # Express backend (:3001)
  src/index.ts             # App setup, middleware, route mounting
  src/db.ts                # Prisma client singleton
  src/schemas/             # Zod validation schemas (one file per resource)
  src/middleware/           # errorHandler.ts (ZodError→400, NotFoundError→404, else→500)
  src/routes/              # Express routers (users, lists, items, purchases)
  prisma/schema.prisma     # Database schema (7 models)
  prisma/seed.ts           # Test data seeder
  prisma.config.ts         # Prisma config (seed command)
shared/                    # Shared TypeScript types
  src/index.ts             # ListStatus enum, CartState enum, HealthResponse, barrel re-exports
  src/models.ts            # Base DB model interfaces (User, List, Item, etc.)
  src/responses.ts         # Nested response shapes (ListWithDetails, etc.) + DebtEntry, SplitsResponse, ApiError
  src/requests.ts          # Request body types (CreateUserBody, etc.)
```

## Commands

```bash
npm run dev                        # Start both servers (concurrently)
npm run db:migrate -w server       # Run Prisma migrations
npm run db:seed -w server          # Seed test data
npm run db:studio -w server        # Open Prisma Studio
```

## Database Schema

7 models: User, List, ListMember, Item, ItemExclusion, Purchase, PurchaseItem.

- All tables use autoincrement integer IDs
- `List.shareToken` is a cuid2 string for share URLs (unique indexed)
- Enum-like fields stored as String (SQLite has no enum support): `List.status` ("open"/"closed"), `Item.cartState` ("needed"/"inCart"/"purchased")
- `ItemExclusion`: a row means the user is EXCLUDED from splitting that item; no row = included (default)
- `PurchaseItem.priceCents`: money as integer cents, never floats
- All FK columns have indexes; cascade deletes on all child relations

## API Endpoints

All mounted under `/api` in `server/src/index.ts`.

- **Users**: POST /users, GET /users/:id
- **Lists**: POST /lists, GET /lists/:id (includes members+items), PATCH /lists/:id, DELETE /lists/:id, GET /lists/join/:shareToken
- **Members**: GET/POST /lists/:listId/members, DELETE /lists/:listId/members/:userId
- **Items**: POST /lists/:listId/items, GET /lists/:listId/items, PATCH /items/:id, DELETE /items/:id
- **Exclusions**: POST /items/:itemId/exclusions, DELETE /items/:itemId/exclusions/:userId
- **Purchases**: POST /lists/:listId/purchases (nested create), GET /lists/:listId/purchases, GET /lists/:listId/splits (cost splitting)

## Key Patterns

- **Express 5** auto-catches async errors — no try/catch wrappers needed in route handlers
- **Zod schemas** in `server/src/schemas/` validate all request bodies; errors forwarded to error handler
- **NotFoundError** class (from `middleware/errorHandler.ts`) — throw from route handlers for 404s
- **Prisma nested creates** for purchases (purchase + items in one implicit transaction)
- **Shared package** uses `"type": "module"` and `"exports"` field for ESM compatibility with tsx
- **Client API layer** (`client/src/api/`) — typed fetch wrapper; all API calls go through this, not raw `fetch`. Throws `ApiRequestError` on non-2xx responses
- **Client routing** — React Router with `Layout` > page pattern. Routes: `/` (home), `/list/:id`, `/join/:shareToken`
- **User identity** — stored in `localStorage` as `"hestia-user"` (JSON User object), set during join flow. Read via `getSavedUser()` helper in pages
- **Join flow** — JoinPage handles 3 cases: already-a-member (auto-redirect), returning user (quick rejoin), new user (full form). HomePage auto-adds creator as member
- **List view state** — ListPage holds `ListWithDetails` in local state; child components call API then notify parent via callbacks (`onUpdated` upserts, `onDeleted` removes) to update state without re-fetching
- **Cart state cycling** — ItemRow cycles needed→inCart→purchased→needed on click via `NEXT_STATE` map
- **Optimistic updates** — Add item (temp negative id, reconciled on server response), cart-state cycle, and item delete all apply locally first and roll back + toast on error. Items with `id < 0` are pending and render dimmed with disabled actions
- **Toasts** — Use `useToast()` from `components/Toast.tsx` for transient feedback (errors, confirmations). App is wrapped in `<ToastProvider>` in `App.tsx`. Don't throw from callbacks passed to forms — handle + toast in the parent
- **Loading states** — Use `Skeleton` components instead of plain "Loading..." text; empty states use dashed-border cards with an icon + helper copy

## Conventions

- Cart state values: `"needed"`, `"inCart"`, `"purchased"` (camelCase, not snake_case)
- List status values: `"open"`, `"closed"`
- Use enums from `shared` (`CartState`, `ListStatus`) — not string literals — for type safety
- DELETE endpoints return 204 with no body
- GET endpoints that include related data use Prisma `include` (not separate queries)

## Current Status

See `PLAN.md` for the full feature roadmap. Milestones 0-8 are complete (skeleton, server foundation, CRUD endpoints, shared types + API client, routing + pages, list view core UI, join flow, checkout + cost splitting, polish & UX). Next up: Milestone 9 (real-time sync via SSE).

## No Auth

There is no authentication. Users are created ad-hoc (name + color) when joining a list via share link. User ID is stored in localStorage on the client. This is intentional for now.
