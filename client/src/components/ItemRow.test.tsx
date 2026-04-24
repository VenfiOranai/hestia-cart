import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { CartState } from "shared";
import type { ItemWithDetails, ListMemberWithUser } from "shared";
import ItemRow from "./ItemRow";
import { ToastProvider } from "./Toast";

// Mock the API module so we can assert on the calls without hitting fetch.
const updateItem = vi.fn();
const deleteItem = vi.fn();
vi.mock("../api", () => ({
  updateItem: (...args: unknown[]) => updateItem(...args),
  deleteItem: (...args: unknown[]) => deleteItem(...args),
}));

function renderRow(overrides: Partial<ItemWithDetails> = {}) {
  const item: ItemWithDetails = {
    id: 1,
    listId: 1,
    name: "Milk",
    cartState: CartState.Needed,
    createdByUserId: 10,
    createdAt: new Date("2025-01-01").toISOString(),
    createdBy: {
      id: 10,
      name: "Alice",
      color: "#4f46e5",
      createdAt: new Date("2025-01-01").toISOString(),
    },
    exclusions: [],
    ...overrides,
  };
  const members: ListMemberWithUser[] = [
    {
      id: 1,
      userId: 10,
      listId: 1,
      joinedAt: new Date("2025-01-01").toISOString(),
      user: item.createdBy,
    },
  ];
  const onUpdated = vi.fn();
  const onDeleted = vi.fn();
  const onExclusionClick = vi.fn();
  const utils = render(
    <ToastProvider>
      <ItemRow
        item={item}
        members={members}
        onUpdated={onUpdated}
        onDeleted={onDeleted}
        onExclusionClick={onExclusionClick}
      />
    </ToastProvider>,
  );
  return { ...utils, item, onUpdated, onDeleted, onExclusionClick };
}

describe("ItemRow", () => {
  beforeEach(() => {
    updateItem.mockReset();
    deleteItem.mockReset();
  });

  it("cycles the state from needed → inCart on click", async () => {
    const user = userEvent.setup();
    const updated = {
      id: 1,
      listId: 1,
      name: "Milk",
      cartState: CartState.InCart,
      createdByUserId: 10,
      createdAt: new Date("2025-01-01").toISOString(),
      createdBy: {
        id: 10,
        name: "Alice",
        color: "#4f46e5",
        createdAt: new Date("2025-01-01").toISOString(),
      },
      exclusions: [],
    };
    updateItem.mockResolvedValue(updated);

    const { onUpdated } = renderRow();
    await user.click(screen.getByRole("button", { name: /needed/i }));

    expect(updateItem).toHaveBeenCalledWith(1, { cartState: CartState.InCart });
    // onUpdated is called twice: optimistic + server reconcile.
    expect(onUpdated).toHaveBeenCalledTimes(2);
    expect(onUpdated.mock.calls[0][0].cartState).toBe(CartState.InCart);
    expect(onUpdated.mock.calls[1][0]).toEqual(updated);
  });

  it("rolls back on cycle failure", async () => {
    const user = userEvent.setup();
    updateItem.mockRejectedValue(new Error("server sad"));

    const { onUpdated, item } = renderRow();
    await user.click(screen.getByRole("button", { name: /needed/i }));

    // First call is the optimistic update, last call is the rollback to the original snapshot.
    expect(onUpdated).toHaveBeenCalledTimes(2);
    expect(onUpdated.mock.calls[1][0]).toEqual(item);
  });

  it("deletes the item on × click", async () => {
    const user = userEvent.setup();
    deleteItem.mockResolvedValue(undefined);

    const { onDeleted } = renderRow();
    // Buttons carry semantic labels via `title`; accessible name resolves from
    // visible text, so query by title to disambiguate.
    await user.click(screen.getByTitle("Delete item"));

    expect(deleteItem).toHaveBeenCalledWith(1);
    expect(onDeleted).toHaveBeenCalledWith(1);
  });

  it("disables actions for a pending (temp-id) item", () => {
    renderRow({ id: -1 });
    expect(screen.getByTitle("Delete item")).toBeDisabled();
    expect(screen.getByTitle("Edit exclusions")).toBeDisabled();
    expect(screen.getByRole("button", { name: /needed/i })).toBeDisabled();
  });

  it("shows a colored initial avatar for each participating member", () => {
    renderRow();
    const avatar = screen.getByTitle("Alice");
    expect(avatar).toHaveTextContent("A");
    expect(avatar).toHaveStyle({ backgroundColor: "rgb(79, 70, 229)" });
  });
});
