import type {
  Item,
  ItemExclusion,
  List,
  ListMember,
  Purchase,
  PurchaseItem,
  User,
} from "./models.js";

/** A list member with the user object included. */
export interface ListMemberWithUser extends ListMember {
  user: User;
}

/** An item with its exclusions and creator included. */
export interface ItemWithDetails extends Item {
  exclusions: ItemExclusion[];
  createdBy: User;
}

/** A full list response from GET /api/lists/:id or GET /api/lists/join/:shareToken. */
export interface ListWithDetails extends List {
  members: ListMemberWithUser[];
  items: ItemWithDetails[];
}

/** A purchase item with the item it refers to. */
export interface PurchaseItemWithItem extends PurchaseItem {
  item: Item;
}

/** A purchase with its line items and payer included. */
export interface PurchaseWithDetails extends Purchase {
  items: PurchaseItemWithItem[];
  payer: User;
}

/** A single debt between two users. */
export interface DebtEntry {
  from: User;
  to: User;
  amountCents: number;
}

/** Response from GET /api/lists/:listId/splits. */
export interface SplitsResponse {
  debts: DebtEntry[];
  totalCents: number;
}

/** Error response shape returned by the server. */
export interface ApiError {
  error: string;
  details?: { path: string; message: string }[];
}
