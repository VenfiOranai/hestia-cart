import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getList } from "../api";
import { CartState } from "shared";
import type { ItemWithDetails, ListWithDetails, User } from "shared";
import AddItemForm from "../components/AddItemForm";
import ItemRow from "../components/ItemRow";
import ExclusionModal from "../components/ExclusionModal";
import ShareButton from "../components/ShareButton";
import MemberList from "../components/MemberList";

/** Read the saved user from localStorage (set during join flow). */
function getSavedUser(): User | null {
  const raw = localStorage.getItem("hestia-user");
  return raw ? JSON.parse(raw) : null;
}

export default function ListPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [list, setList] = useState<ListWithDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exclusionItem, setExclusionItem] = useState<ItemWithDetails | null>(null);

  const currentUser = getSavedUser();
  const currentUserId = currentUser?.id ?? null;

  useEffect(() => {
    if (!id) return;
    getList(Number(id))
      .then(setList)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Loading list...</p>
      </div>
    );
  }

  // Group items by cartState
  const needed = list.items.filter((i) => i.cartState === CartState.Needed);
  const inCart = list.items.filter((i) => i.cartState === CartState.InCart);
  const purchased = list.items.filter((i) => i.cartState === CartState.Purchased);

  function handleItemAdded(item: ItemWithDetails) {
    setList((prev) =>
      prev ? { ...prev, items: [...prev.items, item] } : prev
    );
  }

  function handleItemUpdated(updated: ItemWithDetails) {
    setList((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) => (i.id === updated.id ? updated : i)),
          }
        : prev
    );
    // Also update the exclusion modal if it's showing this item
    if (exclusionItem?.id === updated.id) {
      setExclusionItem(updated);
    }
  }

  function handleItemDeleted(itemId: number) {
    setList((prev) =>
      prev
        ? { ...prev, items: prev.items.filter((i) => i.id !== itemId) }
        : prev
    );
  }

  function handleMemberRemoved(userId: number) {
    if (userId === currentUserId) {
      navigate("/");
      return;
    }
    setList((prev) =>
      prev
        ? {
            ...prev,
            members: prev.members.filter((m) => m.userId !== userId),
          }
        : prev
    );
  }

  function renderGroup(label: string, items: ItemWithDetails[]) {
    if (items.length === 0) return null;
    return (
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 px-1">
          {label} ({items.length})
        </h3>
        <ul className="divide-y divide-gray-200 border rounded-lg bg-white">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              members={list!.members}
              onUpdated={handleItemUpdated}
              onDeleted={handleItemDeleted}
              onExclusionClick={setExclusionItem}
            />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{list.name}</h1>
          <p className="text-sm text-gray-500">
            {list.members.length} member{list.members.length !== 1 && "s"} &middot;{" "}
            {list.items.length} item{list.items.length !== 1 && "s"}
          </p>
        </div>
        <ShareButton shareToken={list.shareToken} />
      </div>

      {/* Add item */}
      <AddItemForm
        listId={list.id}
        userId={currentUserId}
        onItemAdded={handleItemAdded}
      />

      {/* Items grouped by state */}
      {list.items.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">
          No items yet. Add one to get started.
        </p>
      ) : (
        <div className="space-y-4">
          {renderGroup("Needed", needed)}
          {renderGroup("In Cart", inCart)}
          {renderGroup("Purchased", purchased)}
        </div>
      )}

      {/* Members */}
      <MemberList
        members={list.members}
        listId={list.id}
        currentUserId={currentUserId}
        onMemberRemoved={handleMemberRemoved}
      />

      {/* Exclusion modal */}
      {exclusionItem && (
        <ExclusionModal
          item={exclusionItem}
          members={list.members}
          onClose={() => setExclusionItem(null)}
          onUpdated={handleItemUpdated}
        />
      )}
    </div>
  );
}
