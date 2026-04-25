import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createItem, getList } from "../api";
import { CartState } from "shared";
import type { ItemWithDetails, ListWithDetails, PurchaseWithDetails, User } from "shared";
import AddItemForm from "../components/AddItemForm";
import ItemRow from "../components/ItemRow";
import ExclusionModal from "../components/ExclusionModal";
import ShareButton from "../components/ShareButton";
import MembersModal from "../components/MembersModal";
import CheckoutModal from "../components/CheckoutModal";
import SplitsCard from "../components/SplitsCard";
import { ListPageSkeleton } from "../components/Skeleton";
import { useToast } from "../components/Toast";
import { useListSocket } from "../hooks/useListSocket";

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
  const [showMembers, setShowMembers] = useState(false);
  const [splitsRefreshKey, setSplitsRefreshKey] = useState(0);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const currentUser = getSavedUser();
  const currentUserId = currentUser?.id ?? null;

  useEffect(() => {
    if (!id) return;
    getList(Number(id))
      .then(setList)
      .catch((err) => setError(err.message));
  }, [id]);

  // Subscribe to live updates for this list. The hook handles reconnect with
  // exponential backoff and fires onReconnect so we can refetch once to catch
  // any events that happened while we were disconnected.
  const socketListId = list?.id ?? null;
  useListSocket(socketListId, {
    onEvent: (event) => {
      switch (event.type) {
        case "item:added":
        case "item:updated": {
          const incoming = event.payload;
          setList((prev) => {
            if (!prev) return prev;
            const exists = prev.items.some((i) => i.id === incoming.id);
            const items = exists
              ? prev.items.map((i) => (i.id === incoming.id ? incoming : i))
              : [...prev.items, incoming];
            return { ...prev, items };
          });
          setExclusionItem((current) =>
            current && current.id === incoming.id ? incoming : current,
          );
          break;
        }
        case "item:deleted": {
          const deletedId = event.payload.id;
          setList((prev) =>
            prev
              ? { ...prev, items: prev.items.filter((i) => i.id !== deletedId) }
              : prev,
          );
          setExclusionItem((current) =>
            current && current.id === deletedId ? null : current,
          );
          break;
        }
        case "member:joined": {
          const member = event.payload;
          setList((prev) => {
            if (!prev) return prev;
            if (prev.members.some((m) => m.id === member.id)) return prev;
            return { ...prev, members: [...prev.members, member] };
          });
          break;
        }
        case "member:left": {
          const leftUserId = event.payload.userId;
          setList((prev) =>
            prev
              ? { ...prev, members: prev.members.filter((m) => m.userId !== leftUserId) }
              : prev,
          );
          break;
        }
        case "purchase:created":
          setSplitsRefreshKey((k) => k + 1);
          break;
      }
    },
    onReconnect: () => {
      if (socketListId == null) return;
      getList(socketListId)
        .then(setList)
        .catch(() => {});
    },
  });

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
      // When adding an item, the WS echo can race the POST response. If the
      // real row is already in the list by the time the POST resolves, drop
      // the temp-id row instead of creating a duplicate.
      const alreadyHasReal = prev.items.some(
        (i) => i.id === updated.id && i.id !== lookupId,
      );
      let items: ItemWithDetails[];
      if (alreadyHasReal) {
        items = prev.items
          .filter((i) => i.id !== lookupId)
          .map((i) => (i.id === updated.id ? updated : i));
      } else if (prev.items.some((i) => i.id === lookupId)) {
        items = prev.items.map((i) => (i.id === lookupId ? updated : i));
      } else {
        items = [...prev.items, updated];
      }
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
    const isCollapsed = collapsedGroups.has(label);
    return (
      <div>
        <button
          type="button"
          onClick={() => toggleGroup(label)}
          aria-expanded={!isCollapsed}
          className="flex w-full items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 px-1 hover:text-gray-600"
        >
          <span
            aria-hidden="true"
            className={`inline-block transition-transform ${
              isCollapsed ? "" : "rotate-90"
            }`}
          >
            ▸
          </span>
          <span>
            {label} ({items.length})
          </span>
        </button>
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
            isCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
          }`}
        >
          <div className="overflow-hidden">
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 sm:pb-6">
      {/* Back to home */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <span aria-hidden="true">←</span> Back to home
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900">{list.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            <button
              type="button"
              onClick={() => setShowMembers(true)}
              className="inline-flex items-center gap-2 rounded-full px-1 py-0.5 -ml-1 hover:bg-gray-100"
              aria-label="View members"
            >
              <span className="flex -space-x-1.5">
                {list.members.slice(0, 4).map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white text-[10px] font-semibold text-white"
                    style={{ backgroundColor: m.user.color }}
                    title={m.user.name}
                  >
                    {m.user.name.charAt(0).toUpperCase()}
                  </span>
                ))}
                {list.members.length > 4 && (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-gray-300 text-[10px] font-semibold text-gray-700">
                    +{list.members.length - 4}
                  </span>
                )}
              </span>
              <span>
                {list.members.length} member{list.members.length !== 1 && "s"}
              </span>
            </button>
            <span aria-hidden="true">&middot;</span>
            <span>
              {list.items.length} item{list.items.length !== 1 && "s"}
            </span>
          </div>
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

      {/* Members modal */}
      {showMembers && (
        <MembersModal
          members={list.members}
          listId={list.id}
          currentUserId={currentUserId}
          onClose={() => setShowMembers(false)}
          onMemberRemoved={handleMemberRemoved}
        />
      )}
    </div>
  );
}
