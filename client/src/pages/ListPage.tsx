import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createItem, getList } from "../api";
import { CartState } from "shared";
import type { ItemWithDetails, ListWithDetails, PurchaseWithDetails, User } from "shared";
import AddItemForm from "../components/AddItemForm";
import ItemRow from "../components/ItemRow";
import ExclusionModal from "../components/ExclusionModal";
import ShareButton from "../components/ShareButton";
import MemberList from "../components/MemberList";
import CheckoutModal from "../components/CheckoutModal";
import SplitsCard from "../components/SplitsCard";
import { ListPageSkeleton } from "../components/Skeleton";
import { useToast } from "../components/Toast";

/** Read the saved user from localStorage (set during join flow). */
function getSavedUser(): User | null {
  const raw = localStorage.getItem("hestia-user");
  return raw ? JSON.parse(raw) : null;
}

export default function ListPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [list, setList] = useState<ListWithDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exclusionItem, setExclusionItem] = useState<ItemWithDetails | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [splitsRefreshKey, setSplitsRefreshKey] = useState(0);

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
    return <ListPageSkeleton />;
  }

  // Group items by cartState
  const needed = list.items.filter((i) => i.cartState === CartState.Needed);
  const inCart = list.items.filter((i) => i.cartState === CartState.InCart);
  const purchased = list.items.filter((i) => i.cartState === CartState.Purchased);

  /** Upsert an item into the list (insert if missing, replace if present). */
  function handleItemUpserted(updated: ItemWithDetails, replaceId?: number) {
    setList((prev) => {
      if (!prev) return prev;
      const lookupId = replaceId ?? updated.id;
      const exists = prev.items.some((i) => i.id === lookupId);
      const items = exists
        ? prev.items.map((i) => (i.id === lookupId ? updated : i))
        : [...prev.items, updated];
      return { ...prev, items };
    });
    if (exclusionItem && exclusionItem.id === (replaceId ?? updated.id)) {
      setExclusionItem(updated);
    }
  }

  function handleItemDeleted(itemId: number) {
    setList((prev) =>
      prev ? { ...prev, items: prev.items.filter((i) => i.id !== itemId) } : prev,
    );
  }

  /** Optimistically add an item, reconcile with the server response. */
  async function handleAddItem(name: string) {
    if (!currentUser || !currentUserId) return;
    const tempId = -Date.now();
    const optimistic: ItemWithDetails = {
      id: tempId,
      listId: list!.id,
      name,
      cartState: CartState.Needed,
      createdByUserId: currentUserId,
      createdAt: new Date().toISOString(),
      exclusions: [],
      createdBy: currentUser,
    };
    handleItemUpserted(optimistic);
    try {
      const real = await createItem(list!.id, {
        name,
        createdByUserId: currentUserId,
      });
      handleItemUpserted(real, tempId);
    } catch (err) {
      handleItemDeleted(tempId);
      toast.error(err instanceof Error ? err.message : "Couldn't add item");
    }
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
        : prev,
    );
  }

  function handlePurchaseCreated(_purchase: PurchaseWithDetails) {
    // Bump the key so SplitsCard refetches
    setSplitsRefreshKey((k) => k + 1);
    toast.success("Purchase recorded");
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
              onUpdated={handleItemUpserted}
              onDeleted={handleItemDeleted}
              onExclusionClick={setExclusionItem}
            />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 sm:pb-6">
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

      {/* Items grouped by state */}
      {list.items.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white py-10 px-4 text-center">
          <p className="text-3xl mb-2">🛒</p>
          <p className="text-sm font-medium text-gray-700">No items yet</p>
          <p className="text-xs text-gray-400 mt-1">
            {currentUserId
              ? "Add your first item below to get started."
              : "Join the list to add items."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {renderGroup("Needed", needed)}
          {renderGroup("In Cart", inCart)}
          {renderGroup("Purchased", purchased)}
        </div>
      )}

      {/* Record purchase button */}
      {currentUserId && list.items.length > 0 && (
        <button
          onClick={() => setShowCheckout(true)}
          className="w-full min-h-[44px] rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Record Purchase
        </button>
      )}

      {/* Cost splits */}
      <SplitsCard listId={list.id} refreshKey={splitsRefreshKey} />

      {/* Members */}
      <MemberList
        members={list.members}
        listId={list.id}
        currentUserId={currentUserId}
        onMemberRemoved={handleMemberRemoved}
      />

      {/* Bottom-anchored add-item input (mobile-friendly) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <div className="mx-auto w-full max-w-lg">
          <AddItemForm userId={currentUserId} onSubmit={handleAddItem} />
        </div>
      </div>

      {/* Exclusion modal */}
      {exclusionItem && (
        <ExclusionModal
          item={exclusionItem}
          members={list.members}
          onClose={() => setExclusionItem(null)}
          onUpdated={(item) => handleItemUpserted(item)}
        />
      )}

      {/* Checkout modal */}
      {showCheckout && currentUserId && (
        <CheckoutModal
          listId={list.id}
          items={list.items}
          members={list.members}
          currentUserId={currentUserId}
          onClose={() => setShowCheckout(false)}
          onPurchaseCreated={handlePurchaseCreated}
        />
      )}
    </div>
  );
}
