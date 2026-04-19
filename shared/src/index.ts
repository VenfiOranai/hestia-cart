// Shared types for Hestia Cart.
// API request/response types will live here so both client and server stay in sync.

/** Possible states for a shopping list */
export enum ListStatus {
  Open = "open",
  Closed = "closed",
}

/** Possible states for an item in the cart */
export enum CartState {
  Needed = "needed",
  InCart = "inCart",
  Purchased = "purchased",
}

/** Shape returned by GET /api/health */
export interface HealthResponse {
  status: "ok";
  timestamp: string;
}
