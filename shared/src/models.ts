import type { CartState, ListStatus } from "./index.js";

export interface User {
  id: number;
  name: string;
  color: string;
  createdAt: string;
}

export interface List {
  id: number;
  shareToken: string;
  name: string;
  status: ListStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ListMember {
  id: number;
  userId: number;
  listId: number;
  joinedAt: string;
}

export interface Item {
  id: number;
  listId: number;
  name: string;
  cartState: CartState;
  createdByUserId: number;
  createdAt: string;
}

export interface ItemExclusion {
  id: number;
  itemId: number;
  userId: number;
}

export interface Purchase {
  id: number;
  listId: number;
  payerUserId: number;
  createdAt: string;
}

export interface PurchaseItem {
  id: number;
  purchaseId: number;
  itemId: number;
  priceCents: number;
}
