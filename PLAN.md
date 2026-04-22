# Hestia Cart — Feature Plan

> Status: **Milestone 10 complete.** This document tracks every feature needed to go from scaffold to working app. Milestones are ordered by dependency — each one builds on the last.

---

## Milestone 0 — Skeleton (DONE)

What's already in place:

- Monorepo (`client/`, `server/`, `shared/`) with npm workspaces
- Express server with `GET /api/health`, CORS, JSON parsing, Zod installed
- Prisma schema: User, List, ListMember, Item, ItemExclusion, Purchase, PurchaseItem
- SQLite database with seed data (3 users, 1 list, 4 items, 2 exclusions, 1 purchase)
- React client with Tailwind, Vite proxy to Express, health-check display
- Shared types: `HealthResponse`, `ListStatus` (enum), `CartState` (enum)

---

## Milestone 1 — Server Foundation (DONE)

- `server/src/db.ts` — Prisma client singleton
- `server/src/schemas/` — Zod validation schemas split per resource (`users.ts`, `lists.ts`, `items.ts`, `purchases.ts`) with barrel `index.ts`
- `server/src/middleware/errorHandler.ts` — error handler (400 Zod, 404 NotFoundError, 500 fallback)
- `server/src/routes/` — stub routers for users, lists, items, purchases, mounted in `index.ts`
- Shared types updated to enums (`ListStatus`, `CartState`); seed data aligned (`"inCart"` not `"in_cart"`)

---

## Milestone 2 — Core CRUD Endpoints (DONE)

All REST endpoints implemented with Zod validation, 404 handling, and tested via curl.

- `server/src/routes/users.ts` — POST create, GET by id
- `server/src/routes/lists.ts` — POST create (auto-generates shareToken via cuid2), GET by id (includes members + items), PATCH, DELETE (cascades), GET join by shareToken, member CRUD
- `server/src/routes/items.ts` — POST create, GET by list, PATCH (name/cartState), DELETE, exclusion create/delete
- `server/src/routes/purchases.ts` — POST create (nested purchase items in one transaction), GET by list
- Installed `@paralleldrive/cuid2` for share token generation
- Fixed `shared/package.json`: added `"type": "module"` and `"exports"` for ESM compatibility

---

## Milestone 3 — Shared Types & API Client (DONE)

- `shared/src/api.ts` — all API types: base models (User, List, Item, etc.), nested response shapes (ListWithDetails, ItemWithDetails, PurchaseWithDetails), request body types, ApiError
- `shared/src/index.ts` — barrel re-exports all API types
- `client/src/api.ts` — typed fetch wrapper with `ApiRequestError` class; functions for every endpoint (getHealth, createUser, getList, createItem, updateItem, addExclusion, createPurchase, etc.)
- `client/src/App.tsx` — updated to use `getHealth()` from API layer instead of raw fetch

---

## Milestone 4 — Client Routing & Pages (DONE)

- Installed `react-router-dom`
- `client/src/App.tsx` — BrowserRouter with routes: `/`, `/list/:id`, `/join/:shareToken`
- `client/src/components/Layout.tsx` — header with home link, max-w-lg centered content area, mobile-first
- `client/src/pages/HomePage.tsx` — create-list form, shows saved user identity from localStorage
- `client/src/pages/ListPage.tsx` — fetches list by id, shows items + members (placeholder UI for M5)
- `client/src/pages/JoinPage.tsx` — fetches list by shareToken, name input + color picker (8 colors), creates user, joins list, saves to localStorage, redirects to list

---

## Milestone 5 — List View Core UI (DONE)

- `client/src/pages/ListPage.tsx` — full rewrite: fetches list, groups items by cartState (needed/inCart/purchased), manages local state updates for all mutations
- `client/src/components/AddItemForm.tsx` — text input + submit, disabled if no saved user identity
- `client/src/components/ItemRow.tsx` — tap state badge to cycle (needed→inCart→purchased→needed), delete button, "split" button to open exclusion modal, shows creator name + "not X" exclusion badges
- `client/src/components/ExclusionModal.tsx` — bottom-sheet style modal, checkbox per member (checked=included, unchecked=excluded), saves immediately per toggle
- `client/src/components/ShareButton.tsx` — copies share URL to clipboard, shows "Link copied!" for 2s
- `client/src/components/MemberList.tsx` — colored member badges with "(you)" indicator, "Leave" button removes current user and redirects home

---

## Milestone 6 — Join Flow (DONE)

- `client/src/pages/JoinPage.tsx` — three cases handled:
  1. **Already a member** (saved user id is in the list's members) → auto-redirect to `/list/:id`
  2. **Returning user** (saved identity exists but not a member) → "Join as X" quick-rejoin button, plus option to join as someone new
  3. **New user** → name input + color picker, creates user + joins + saves to localStorage
- `client/src/pages/HomePage.tsx` — after creating a list, auto-adds the saved user as a member (if identity exists)

---

## Milestone 7 — Checkout & Cost Splitting (DONE)

- `GET /api/lists/:listId/splits` — calculates who owes whom, respecting item exclusions; integer-cent math with fair remainder distribution; simplifies mutual debts
- `shared/src/responses.ts` — added `DebtEntry` and `SplitsResponse` types
- `client/src/api/purchases.ts` — added `getSplits()` client function
- `client/src/components/CheckoutModal.tsx` — modal to record a purchase: select payer, check items (pre-selects "purchased" items), enter price per item, submit via `createPurchase()`
- `client/src/components/SplitsCard.tsx` — displays debts ("Alice owes Bob $12.50") with colored name badges and running total; auto-refetches when a new purchase is recorded
- `client/src/pages/ListPage.tsx` — "Record Purchase" button + CheckoutModal + SplitsCard integrated

---

## Milestone 8 — Polish & UX (DONE)

- `client/src/components/Toast.tsx` — lightweight toast context + `useToast` hook (success/error/info variants, auto-dismiss, bottom-center stack). `ToastProvider` wraps the app in `App.tsx`
- `client/src/components/Skeleton.tsx` — `Skeleton`, `ListPageSkeleton`, `JoinPageSkeleton`, `MyListsSkeleton` — replace plain "Loading..." text on all pages
- Empty-state cards with icon + helper copy on `ListPage` (no items) and `HomePage` (no lists)
- Optimistic updates:
  - Add item: `ListPage.handleAddItem` inserts a temp-id item immediately, reconciles with the server response on success, rolls back + toasts on error. `AddItemForm` refactored to delegate creation via `onSubmit(name)`
  - Cart-state cycle: `ItemRow.handleCycleState` applies the next state immediately, reverts on failure
  - Delete: `ItemRow.handleDelete` removes the row immediately, re-inserts on failure
  - Temp-id rows render with reduced opacity and disabled actions until the server confirms
- Toasts wired into: item add/remove errors, cart-state revert, exclusion toggle errors, share-link copy, login/logout, purchase recorded, leave-list errors
- Mobile UX: bottom-anchored add-item input on `ListPage` (fixed on mobile, inline on sm+), 44px tap targets across buttons, bigger color swatches (40px) and larger form inputs
- Color picker already had 8-color palette — kept and standardized in `HomePage` and `JoinPage`

Skipped for now: pull-to-refresh (browser-native behavior is sufficient; WebSockets in M9 will cover live updates).

---

## Milestone 9 — Real-time Sync (DONE)

So multiple people shopping together see updates live.

- `ws` + `@types/ws` added to the server workspace
- `shared/src/events.ts` — typed `ListEvent` union (`item:added`, `item:updated`, `item:deleted`, `member:joined`, `member:left`, `purchase:created`) re-exported from `shared`
- `server/src/ws.ts` — attaches a `WebSocketServer` in `noServer` mode; `httpServer.on("upgrade")` validates `/ws?listId=N` (rejects non-existent lists), tracks connections in `Map<listId, Set<WebSocket>>`, and exposes `broadcast(listId, event)`
- `server/src/index.ts` — creates a raw `http.Server` wrapping Express so the WebSocket server shares the same port (3001)
- Broadcasts wired into `routes/items.ts` (create/update/delete + exclusion add/delete re-emit the updated item), `routes/lists.ts` (member join/leave), and `routes/purchases.ts` (purchase create)
- `client/vite.config.ts` — `/ws` proxied to `ws://localhost:3001` (`ws: true`)
- `client/src/hooks/useListSocket.ts` — WebSocket connection per listId with typed `onEvent`/`onReconnect` callbacks (stored in a ref so changing handlers doesn't reconnect); exponential backoff 1s → 30s on close/error
- `ListPage` subscribes via `useListSocket`; events feed the same state via functional `setList` updates (upsert on item:added/updated, remove on item:deleted, add-if-new on member:joined, filter on member:left, bump `splitsRefreshKey` on purchase:created); `onReconnect` refetches the list once to catch missed events
- Heartbeat: server pings every 30s and terminates sockets that don't pong back; client relies on the browser's automatic pong response and treats `close` as a reconnect signal

Notes:
- The echo-back to the origin client is idempotent — optimistic updates already keyed on id, so `setList` upserts converge
- Payload type in `broadcast()` is intentionally `unknown` because Prisma returns `Date` in memory while the shared wire shape is ISO strings; `JSON.stringify` handles the conversion

---

## Milestone 10 — Hardening (DONE)

### 10.1 Input validation

- `server/src/schemas/params.ts` — new `parseIdParam(value, name?)` helper that coerces path segments to positive integers via Zod; throws a `ZodError` (→ 400 via error handler) instead of letting `NaN` reach Prisma. All `Number(req.params.*)` sites in `routes/users.ts`, `routes/lists.ts`, `routes/items.ts`, `routes/purchases.ts` now use it
- `server/src/schemas/lists.ts` — added `addMemberSchema` (`{ userId: positive int }`) and wired it into `POST /lists/:listId/members`, which previously accepted an untyped body
- Body schemas already cover trim/length/hex-color via existing Zod rules — verified, no changes needed

### 10.2 Rate limiting

- `express-rate-limit` added to the server workspace
- `server/src/middleware/rateLimit.ts` — `createResourceLimiter` (10 requests / minute / IP, draft-7 `RateLimit-*` headers, JSON 429 body)
- Applied to the two endpoints that create rows hardest to garbage-collect: `POST /api/users` and `POST /api/lists`. Mutations on existing resources are intentionally not limited

### 10.3 Error boundaries

- `client/src/components/ErrorBoundary.tsx` — class component using `getDerivedStateFromError`; fallback card with "Try again" (resets state) and "Reload" (hard refresh) buttons, error message in a scrollable pre
- `App.tsx` wraps the entire tree in `<ErrorBoundary>` so render crashes below show a card instead of a blank page

### 10.4 Database indexes review

- Confirmed: all FK columns already have indexes (`ListMember.userId` / `.listId`, `Item.listId` / `.createdByUserId`, `ItemExclusion.itemId` / `.userId`, `Purchase.listId` / `.payerUserId`, `PurchaseItem.purchaseId` / `.itemId`). `List.shareToken` is uniquely indexed, `ListMember` has a composite unique on `[userId, listId]`
- No composite `[listId, createdAt]` indexes added — the common `findMany where listId orderBy createdAt` queries are cheap at current scale and SQLite/Postgres both handle them with the existing single-column FK index. Defer until real profiling warrants it

---

## Milestone 11 — Testing

### 11.1 Server integration tests

- Test each endpoint with a real SQLite database (not mocks)
- Use Vitest + supertest
- Seed data before each test suite, clean up after

### 11.2 Client component tests

- Use Vitest + React Testing Library
- Test key interactions: add item, change state, join flow

### 11.3 End-to-end tests

- Use Playwright
- Test the full flow: create list → share → join → add items → checkout → view splits

---

## Milestone 12 — Deployment

### 12.1 Migrate to Postgres

- Change Prisma datasource provider to `postgresql`
- Use `DATABASE_URL` environment variable
- Re-generate migrations for Postgres

### 12.2 Production build

- Client: `vite build` → static files
- Server: compile TypeScript, serve client static files from Express in production
- Single `npm run build` script at root

### 12.3 Deployment target

- Options: Railway, Fly.io, Render (all support Node + Postgres)
- Add a `Dockerfile` or use the platform's buildpack
- Environment variables: `DATABASE_URL`, `PORT`, `NODE_ENV`

### 12.4 Domain & HTTPS

- Custom domain via the hosting provider
- HTTPS handled by the platform

---

## Suggested build order

```
M1 (server foundation) ──→ M2 (CRUD) ──→ M3 (shared types + API client)
                                              │
                                              ▼
                                         M4 (routing) ──→ M5 (list UI) ──→ M6 (join flow)
                                                                               │
                                                                               ▼
                                                                          M7 (checkout/splits)
                                                                               │
                                                                               ▼
                                                                          M8 (polish)
                                                                               │
                                                                               ▼
                                                                          M9 (real-time)
                                                                               │
                                                                               ▼
                                                                     M10 (hardening) ──→ M11 (testing) ──→ M12 (deploy)
```

Milestones 1-7 are the core product. Milestones 8-12 are refinement and production-readiness.
