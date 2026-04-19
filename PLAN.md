# Hestia Cart — Feature Plan

> Status: **Milestone 3 complete.** This document tracks every feature needed to go from scaffold to working app. Milestones are ordered by dependency — each one builds on the last.

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

## Milestone 4 — Client Routing & Pages

### 4.1 Install React Router

Add `react-router-dom` for client-side routing.

### 4.2 Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Create a new list or enter a share link |
| `/list/:id` | List View | Main shopping list UI |
| `/join/:shareToken` | Join | Enter name + pick color, then redirect to list |

### 4.3 Layout

- Simple layout component with a header (app name, current user indicator)
- Mobile-first design — this app will mostly be used on phones in a store

---

## Milestone 5 — List View (Core UI)

The main screen of the app. This is where users spend almost all their time.

### 5.1 Item list

- Display items grouped or filtered by `cartState` (needed / in cart / purchased)
- Tap to cycle state: needed → in_cart → purchased
- Swipe or long-press to delete
- Show who added each item
- Show exclusion indicators (e.g., "not Carol" badge)

### 5.2 Add item form

- Text input + submit button at the top or bottom of the list
- Optimistic UI: add to list immediately, reconcile with server response

### 5.3 Member sidebar / drawer

- Show all members with their avatar color
- Option to leave the list

### 5.4 Share button

- Copy the share URL (`/join/:shareToken`) to clipboard
- Show a toast confirmation

### 5.5 Item exclusion UI

- When viewing/editing an item, show checkboxes for each member
- Checked = included (default), unchecked = excluded
- Save exclusions via API

---

## Milestone 6 — Join Flow

What happens when someone opens a share link.

1. `GET /api/lists/join/:shareToken` to look up the list
2. If the user doesn't exist yet, show a form: enter name, pick a color
3. `POST /api/users` to create the user
4. `POST /api/lists/:listId/members` to join
5. Redirect to `/list/:id`

Store the current user's ID in localStorage so they're "remembered" on that device. No real auth — just a local identity.

---

## Milestone 7 — Checkout & Cost Splitting

### 7.1 Checkout flow

- Button: "Record purchase" on the list view
- Select which items were purchased (pre-select items with `cartState: purchased`)
- Enter price for each item
- Confirm → `POST /api/lists/:listId/purchases`

### 7.2 Split calculation endpoint

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/lists/:listId/splits` | Calculate who owes whom |

**Splitting logic:**

For each purchase item:
1. Find all list members
2. Subtract excluded users (from ItemExclusion)
3. Split `priceCents` equally among remaining users (integer division, remainder goes to first user)
4. The payer paid for everyone — each non-payer's share is what they owe the payer

Aggregate across all purchases to get net balances. Simplify debts (A owes B $5, B owes A $3 → A owes B $2).

### 7.3 Splits display

- Show a summary card: "Alice owes Bob ₪12.50" etc.
- Show per-item breakdown on tap

---

## Milestone 8 — Polish & UX

### 8.1 Loading & empty states

- Skeleton loaders while fetching
- Empty state illustrations/messages ("No items yet — add one!")

### 8.2 Optimistic updates

- Item state changes (needed → in_cart) update immediately, revert on error
- Add item appears in list before server confirms

### 8.3 Toast notifications

- "Item added", "Link copied", "Purchase recorded", error messages
- Use a lightweight toast library or build a simple one with Tailwind

### 8.4 Mobile UX

- Bottom-anchored add-item input
- Pull-to-refresh
- Touch-friendly tap targets (min 44px)

### 8.5 Color picker

- Pre-defined palette of 8-12 colors for user avatars
- Show as colored circles in the join flow

---

## Milestone 9 — Real-time Sync

So multiple people shopping together see updates live.

### 9.1 Server-Sent Events (SSE)

SSE is simpler than WebSockets and sufficient for this use case (server → client push).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/lists/:listId/events` | SSE stream for a list |

Events to broadcast:
- `item:added`, `item:updated`, `item:deleted`
- `member:joined`, `member:left`
- `purchase:created`

### 9.2 Client integration

- Open an EventSource connection when viewing a list
- On event, refetch the affected data (or apply the delta directly)
- Reconnect on disconnect

### 9.3 Heartbeat

- Server sends a comment (`: ping`) every 30s to keep the connection alive
- Client reconnects if no data received in 60s

---

## Milestone 10 — Hardening

### 10.1 Input validation

- Zod schemas already defined in `server/src/schemas/` — wire into every POST/PATCH handler
- Sanitize item names (trim whitespace, cap length) — already handled by Zod `.trim().max()`
- Validate hex color format — already handled by Zod regex

### 10.2 Rate limiting

- Basic rate limiting on list creation and user creation to prevent abuse
- Use `express-rate-limit`

### 10.3 Error boundaries

- React error boundary around the app to catch rendering crashes
- Fallback UI with "something went wrong" + retry button

### 10.4 Database indexes review

- Indexes already exist on all FK columns (done in schema)
- Add any composite indexes needed after profiling queries

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
