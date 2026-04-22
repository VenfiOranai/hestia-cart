import type {
  ItemWithDetails,
  ListMemberWithUser,
  PurchaseWithDetails,
} from "./responses.js";

export type ListEvent =
  | { type: "item:added"; payload: ItemWithDetails }
  | { type: "item:updated"; payload: ItemWithDetails }
  | { type: "item:deleted"; payload: { id: number } }
  | { type: "member:joined"; payload: ListMemberWithUser }
  | { type: "member:left"; payload: { userId: number } }
  | { type: "purchase:created"; payload: PurchaseWithDetails };

export type ListEventType = ListEvent["type"];
