# Hestia Cart

Shared grocery list app — "Splitwise meets a notes app" for group grocery shopping. Create a list, share a link, shop together, split costs fairly.

## Tech Stack

- **Monorepo** via npm workspaces: `client/`, `server/`, `shared/`
- **Client**: React 19, Vite, TypeScript, Tailwind CSS 3, React Router
- **Server**: Express 5, TypeScript, Zod validation, `tsx watch` for dev; `ws` for realtime
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
  src/hooks/
    useListSocket.ts       # WebSocket subscription to a list's live event stream (typed onEvent + onReconnect, exponential backoff)
  src/pages/
    HomePage.tsx           # Create a new list
    ListPage.tsx           # Main list view: grouped items, add form, members, share; subscribes via useListSocket
    JoinPage.tsx           # Join via share link (name + color picker)
  src/main.tsx             # Entry point
  vite.config.ts           # Proxy /api/* and /ws → localhost:3001 (ws: true for the socket)
server/                    # Express backend (:3001)
  src/index.ts             # App setup, middleware, route mounting; wraps Express in a raw http.Server so WS shares the port
  src/db.ts                # Prisma client singleton
  src/ws.ts                # WebSocketServer (noServer mode) + broadcast(listId, event) helper + heartbeat
  src/schemas/             # Zod validation schemas (one file per resource)
  src/middleware/           # errorHandler.ts (ZodError→400, NotFoundError→404, else→500)
  src/routes/              # Express routers (users, lists, items, purchases); mutations call broadcast() after DB writes
  prisma/schema.prisma     # Database schema (7 models)
  prisma/seed.ts           # Test data seeder
  prisma.config.ts         # Prisma config (seed command)
shared/                    # Shared TypeScript types
  src/index.ts             # ListStatus enum, CartState enum, HealthResponse, barrel re-exports
  src/models.ts            # Base DB model interfaces (User, List, Item, etc.)
  src/responses.ts         # Nested response shapes (ListWithDetails, etc.) + DebtEntry, SplitsResponse, ApiError
  src/requests.ts          # Request body types (CreateUserBody, etc.)
  src/events.ts            # ListEvent discriminated union for WebSocket broadcasts
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

## WebSocket

- Endpoint: `ws://host/ws?listId=:listId` (same port as the HTTP server)
- Server validates the list exists on upgrade; rejects with `400` / `404` otherwise
- Event frame: `{ type, payload }` matching the `ListEvent` union in `shared/src/events.ts`
- Mutations in the REST routes call `broadcast(listId, event)` after the DB write — clients echo back to the origin too (optimistic-update dedupe handles it)
- Heartbeat: server pings every 30s, terminates unresponsive sockets

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
- **Realtime broadcast** — Every mutation route calls `broadcast(listId, event)` from `server/src/ws.ts` after its DB write; `ListPage` consumes events via `useListSocket` and reuses functional `setList` updaters to stay consistent with optimistic updates. Broadcast payload is typed `unknown` because Prisma hands us `Date`s but the wire shape (from `shared/src/events.ts`) uses ISO strings — `JSON.stringify` handles the conversion
- **Socket reconnect** — `useListSocket` uses exponential backoff (1s → 30s) and fires `onReconnect` after any non-initial open; `ListPage` handles it by refetching the full list once so any events missed during disconnect are applied

## Conventions

- Cart state values: `"needed"`, `"inCart"`, `"purchased"` (camelCase, not snake_case)
- List status values: `"open"`, `"closed"`
- Use enums from `shared` (`CartState`, `ListStatus`) — not string literals — for type safety
- DELETE endpoints return 204 with no body
- GET endpoints that include related data use Prisma `include` (not separate queries)

## Current Status

See `PLAN.md` for the full feature roadmap. Milestones 0-9 are complete (skeleton, server foundation, CRUD endpoints, shared types + API client, routing + pages, list view core UI, join flow, checkout + cost splitting, polish & UX, realtime sync via WebSockets). Next up: Milestone 10 (hardening — rate limiting, error boundaries, index review).

## No Auth

There is no authentication. Users are created ad-hoc (name + color) when joining a list via share link. User ID is stored in localStorage on the client. This is intentional for now.
