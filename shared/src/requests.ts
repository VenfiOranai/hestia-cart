import type { CartState, ListStatus } from "./index.js";

export interface CreateUserBody {
  name: string;
  color: string;
}

export interface CreateListBody {
  name: string;
}

export interface UpdateListBody {
  name?: string;
  status?: ListStatus;
}

export interface CreateItemBody {
  name: string;
  createdByUserId: number;
}

export interface UpdateItemBody {
  name?: string;
  cartState?: CartState;
}

export interface CreateExclusionBody {
  userId: number;
}

export interface CreatePurchaseBody {
  payerUserId: number;
  items: { itemId: number; priceCents: number }[];
}
