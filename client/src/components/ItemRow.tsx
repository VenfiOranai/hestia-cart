import { useState } from "react";
import { CartState } from "shared";
import type { ItemWithDetails, ListMemberWithUser } from "shared";
import { updateItem, deleteItem } from "../api";

/** Cycle through cart states in order. */
const NEXT_STATE: Record<string, CartState> = {
  [CartState.Needed]: CartState.InCart,
  [CartState.InCart]: CartState.Purchased,
  [CartState.Purchased]: CartState.Needed,
};

const STATE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  [CartState.Needed]: { bg: "bg-gray-100", text: "text-gray-600", label: "needed" },
  [CartState.InCart]: { bg: "bg-blue-100", text: "text-blue-700", label: "in cart" },
  [CartState.Purchased]: { bg: "bg-green-100", text: "text-green-700", label: "purchased" },
};

interface Props {
  item: ItemWithDetails;
  members: ListMemberWithUser[];
  onUpdated: (item: ItemWithDetails) => void;
  onDeleted: (itemId: number) => void;
  onExclusionClick: (item: ItemWithDetails) => void;
}

export default function ItemRow({
  item,
  members,
  onUpdated,
  onDeleted,
  onExclusionClick,
}: Props) {
  const [deleting, setDeleting] = useState(false);
  const style = STATE_STYLES[item.cartState] ?? STATE_STYLES[CartState.Needed];

  async function handleCycleState() {
    const next = NEXT_STATE[item.cartState];
    if (!next) return;
    try {
      const updated = await updateItem(item.id, { cartState: next });
      onUpdated(updated);
    } catch {
      // M8 will add toasts for errors
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteItem(item.id);
      onDeleted(item.id);
    } catch {
      setDeleting(false);
    }
  }

  // Build exclusion display: show names of excluded members
  const excludedNames = item.exclusions
    .map((ex) => members.find((m) => m.userId === ex.userId)?.user.name)
    .filter(Boolean);

  return (
    <li className="px-4 py-3 flex items-center gap-3">
      {/* State toggle button */}
      <button
        onClick={handleCycleState}
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
        title={`Click to change state (currently: ${style.label})`}
      >
        {style.label}
      </button>

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            item.cartState === CartState.Purchased
              ? "text-gray-400 line-through"
              : "text-gray-900"
          }`}
        >
          {item.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">
            by{" "}
            <span style={{ color: item.createdBy.color }}>
              {item.createdBy.name}
            </span>
          </span>
          {excludedNames.length > 0 && (
            <span className="text-xs text-orange-500">
              not {excludedNames.join(", ")}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <button
        onClick={() => onExclusionClick(item)}
        className="shrink-0 text-gray-400 hover:text-indigo-600 text-xs"
        title="Edit exclusions"
      >
        split
      </button>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="shrink-0 text-gray-400 hover:text-red-600 text-sm disabled:opacity-50"
        title="Delete item"
      >
        &times;
      </button>
    </li>
  );
}
