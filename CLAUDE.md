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
    ErrorBoundary.tsx      # Top-level React error boundary with Try again / Reload fallback
  src/hooks/
    useListSocket.ts       # WebSocket subscription to a list's live event stream (typed onEvent + onReconnect, exponential backoff)
  src/pages/
    HomePage.tsx           # Create a new list
    ListPage.tsx           # Main list view: grouped items, add form, members, share; subscribes via useListSocket
    JoinPage.tsx           # Join via share link (name + color picker)
  src/main.tsx             # Entry point
  src/test/setup.ts        # Vitest setup: jest-dom matchers + per-test cleanup/localStorage clear
  src/**/*.test.tsx        # Component tests colocated next to the component they cover
  vite.config.ts           # Proxy /api/* and /ws → VITE_API_TARGET (defaults to localhost:3001; overridden in E2E)
  vitest.config.ts         # jsdom, globals, setupFiles
server/                    # Express backend (:3001)
  src/app.ts               # buildApp() factory — middleware + routers + error handler (no HTTP listener)
  src/index.ts             # Thin entrypoint: buildApp() + http.Server + attachWebSocketServer + listen
  src/db.ts                # Prisma client singleton
  src/ws.ts                # WebSocketServer (noServer mode) + broadcast(listId, event) helper + heartbeat
  src/schemas/             # Zod validation schemas (one file per resource + params.ts for parseIdParam)
  src/middleware/           # errorHandler.ts (ZodError→400, NotFoundError→404, else→500); rateLimit.ts (createResourceLimiter)
  src/routes/              # Express routers (users, lists, items, purchases); mutations call broadcast() after DB writes
  src/test/                # Integration tests: globalSetup.ts, db.ts (resetDb), *.test.ts (supertest + real SQLite)
  prisma/schema.prisma     # Database schema (7 models); datasource url = env("DATABASE_URL")
  prisma/seed.ts           # Test data seeder
  prisma.config.ts         # Prisma config (seed command)
  vitest.config.ts         # Points at file:./test.db, fileParallelism: false, globalSetup
  .env                     # DATABASE_URL=file:./dev.db (gitignored; .env.example checked in)
shared/                    # Shared TypeScript types
  src/index.ts             # ListStatus enum, CartState enum, HealthResponse, barrel re-exports
  src/models.ts            # Base DB model interfaces (User, List, Item, etc.)
  src/responses.ts         # Nested response shapes (ListWithDetails, etc.) + DebtEntry, SplitsResponse, ApiError
  src/requests.ts          # Request body types (CreateUserBody, etc.)
  src/events.ts            # ListEvent discriminated union for WebSocket broadcasts
e2e/                       # Playwright E2E suite (runs against its own stack on ports 3101/5174)
  flow.spec.ts             # Full happy-path: login → create list → share → join → add items → purchase → splits
  globalSetup.ts           # Wipes server/prisma/e2e.db and pushes schema before the run
playwright.config.ts       # E2E config: isolated ports, webServer spawns both workspaces, 1 worker
```

## Commands

```bash
npm run dev                        # Start both servers (concurrently)
npm test                           # Server integration + client component tests (Vitest)
npm run test:e2e                   # Playwright E2E (spawns isolated server/client on 3101/5174)
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
- **Path param parsing** — Use `parseIdParam(req.params.foo, "foo")` from `schemas/params.ts` rather than `Number(req.params.foo)`. It coerces via Zod, throws `ZodError` (→ 400) on non-positive-integer input, and keeps `NaN` out of Prisma
- **Rate limiting** — `createResourceLimiter` from `middleware/rateLimit.ts` (10/min/IP) wraps the two creation endpoints that are easiest to abuse: `POST /api/users` and `POST /api/lists`. Mutations on existing rows aren't limited
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
- **Error boundary** — `components/ErrorBoundary.tsx` wraps the whole tree in `App.tsx`; catches rendering errors only (not event-handler / async errors — those need local try/catch + toast). Fallback has "Try again" (reset state) and "Reload" (hard refresh)
- **App factory** — Server is split into `app.ts` (`buildApp()` returning a fully-configured Express app) and `index.ts` (thin HTTP listener + WS attach). Supertest consumes the app directly without claiming a port — do NOT move route wiring back into `index.ts`
- **Test DB isolation** — Prisma datasource reads `env("DATABASE_URL")`; `server/.env` supplies the dev value, `server/vitest.config.ts` overrides to `file:./test.db`, Playwright's `webServer` overrides to `file:./e2e.db`. Each test DB is wiped + schema-pushed by its own globalSetup; between server tests, `resetDb()` (in `src/test/db.ts`) deletes all rows FK-child-first
- **Rate limiter in tests** — `createResourceLimiter` has `skip: () => process.env.NODE_ENV === "test"` because Vitest auto-sets `NODE_ENV=test`. Production code doesn't read a test-only env var; tests bypass the shared counter without resetting module state between cases
- **Optimistic + WS race** — When `handleAddItem` POSTs an item, the WebSocket echo can land before the POST response. `ListPage.handleItemUpserted` handles all four orderings: if a row with the server id already exists when the POST resolves, it drops the temp-id row instead of blindly mapping it. Keep this invariant if you refactor the reconciliation
- **Client testing gotchas** — `user-event` stalls under `vi.useFakeTimers()`; use `fireEvent` for timer-dependent tests. The `×` delete button's accessible name is the text content `×`, not the `title` attribute — use `getByTitle("Delete item")`, not `getByRole("button", { name: /delete/i })`

## Conventions

- Cart state values: `"needed"`, `"inCart"`, `"purchased"` (camelCase, not snake_case)
- List status values: `"open"`, `"closed"`
- Use enums from `shared` (`CartState`, `ListStatus`) — not string literals — for type safety
- DELETE endpoints return 204 with no body
- GET endpoints that include related data use Prisma `include` (not separate queries)

## GitHub Workflow

Default mode of work is issue-driven. Never commit directly to `main`.

When the user gives you an issue number `N`:

1. **Read it**: `gh issue view N` — understand scope before designing.
2. **Branch**: `gh issue develop N --checkout` — creates `N-<slug>` linked to the issue and checks it out. Verify with `git branch --show-current`.
3. **Implement** on the branch. Run `npm run typecheck` and `npm test` locally before pushing — CI will run them too, but local is faster feedback.
4. **Commit + push**: `git push -u origin HEAD`.
5. **Open PR**: `gh pr create --fill --body "Closes #N"` (append a short summary). Non-draft, so it triggers CI and signals it's ready for review. The `Closes #N` line auto-closes the issue on merge.
6. **Watch CI**: `gh pr checks --watch`. If anything fails, `gh run view <id> --log-failed` to read the failing step, fix the root cause (no `--no-verify`, no skipping tests), commit, push to the same branch — CI re-runs automatically.
7. **Stop and report** when CI is green. Do **not** merge. The user reviews and merges manually. Output the PR URL so they can jump straight to it.

If CI keeps failing on something that looks unrelated to your change (flaky test, infra issue), surface it to the user instead of silently retrying.

CI lives in `.github/workflows/ci.yml` and runs only on `pull_request` — no run on plain branch pushes without an open PR. Two parallel jobs: `test` (typecheck + unit) and `e2e` (Playwright with cached browsers).

## Current Status

See `PLAN.md` for the full feature roadmap. Milestones 0-11 are complete (skeleton, server foundation, CRUD endpoints, shared types + API client, routing + pages, list view core UI, join flow, checkout + cost splitting, polish & UX, realtime sync via WebSockets, hardening, and testing — 38 server integration tests via supertest + real SQLite, 14 client component tests via Vitest + RTL, Playwright E2E happy-path on isolated ports). Next up: Milestone 12 (deployment — Postgres migration, production build, hosting).

## No Auth

There is no authentication. Users are created ad-hoc (name + color) when joining a list via share link. User ID is stored in localStorage on the client. This is intentional for now.
