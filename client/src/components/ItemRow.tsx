import { useState } from "react";
import { CartState } from "shared";
import type { ItemWithDetails, ListMemberWithUser } from "shared";
import { updateItem, deleteItem } from "../api";
import { useToast } from "./Toast";

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
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);
  const style = STATE_STYLES[item.cartState] ?? STATE_STYLES[CartState.Needed];
  const pending = item.id < 0;

  async function handleCycleState() {
    if (pending) return;
    const next = NEXT_STATE[item.cartState];
    if (!next) return;
    const snapshot = item;
    onUpdated({ ...item, cartState: next });
    try {
      const updated = await updateItem(item.id, { cartState: next });
      onUpdated(updated);
    } catch (err) {
      onUpdated(snapshot);
      toast.error(err instanceof Error ? err.message : "Couldn't update item");
    }
  }

  async function handleDelete() {
    if (pending) return;
    const snapshot = item;
    setDeleting(true);
    onDeleted(item.id);
    try {
      await deleteItem(item.id);
      toast.success("Item removed");
    } catch (err) {
      onUpdated(snapshot);
      toast.error(err instanceof Error ? err.message : "Couldn't remove item");
      setDeleting(false);
    }
  }

  // Build exclusion display: show names of excluded members
  const excludedNames = item.exclusions
    .map((ex) => members.find((m) => m.userId === ex.userId)?.user.name)
    .filter(Boolean);

  // Members participating in the split = all members minus excluded ones.
  const excludedIds = new Set(item.exclusions.map((ex) => ex.userId));
  const participants = members.filter((m) => !excludedIds.has(m.userId));
  const MAX_AVATARS = 4;
  const visibleParticipants = participants.slice(0, MAX_AVATARS);
  const overflow = participants.length - visibleParticipants.length;

  return (
    <li
      className={`px-3 py-3 flex items-center gap-3 ${
        pending ? "opacity-60" : ""
      } ${deleting ? "opacity-40" : ""}`}
    >
      {/* State toggle button */}
      <button
        onClick={handleCycleState}
        disabled={pending || deleting}
        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium min-h-[32px] ${style.bg} ${style.text} disabled:cursor-not-allowed`}
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
        disabled={pending}
        className="shrink-0 min-h-[44px] flex items-center px-2 disabled:opacity-50 rounded hover:bg-gray-50"
        title="Edit exclusions"
        aria-label="Edit split participants"
      >
        {participants.length === 0 ? (
          <span className="text-xs text-gray-400">nobody</span>
        ) : (
          <div className="flex -space-x-1.5">
            {visibleParticipants.map((m) => (
              <span
                key={m.userId}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white text-[10px] font-semibold text-white"
                style={{ backgroundColor: m.user.color }}
                title={m.user.name}
              >
                {m.user.name.charAt(0).toUpperCase()}
              </span>
            ))}
            {overflow > 0 && (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white bg-gray-300 text-[10px] font-semibold text-gray-700">
                +{overflow}
              </span>
            )}
          </div>
        )}
      </button>
      <button
        onClick={handleDelete}
        disabled={deleting || pending}
        className="shrink-0 min-h-[44px] min-w-[44px] text-gray-400 hover:text-red-600 text-xl leading-none disabled:opacity-50"
        title="Delete item"
      >
        &times;
      </button>
    </li>
  );
}
