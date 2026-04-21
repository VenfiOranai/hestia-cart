import { useState } from "react";
import { CartState } from "shared";
import type { ItemWithDetails, ListMemberWithUser } from "shared";
import { createPurchase } from "../api";
import type { PurchaseWithDetails } from "shared";

interface Props {
  listId: number;
  items: ItemWithDetails[];
  members: ListMemberWithUser[];
  currentUserId: number;
  onClose: () => void;
  onPurchaseCreated: (purchase: PurchaseWithDetails) => void;
}

export default function CheckoutModal({
  listId,
  items,
  members,
  currentUserId,
  onClose,
  onPurchaseCreated,
}: Props) {
  // Pre-select items that are already marked "purchased"
  const [selected, setSelected] = useState<Set<number>>(
    new Set(items.filter((i) => i.cartState === CartState.Purchased).map((i) => i.id))
  );
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [payerId, setPayerId] = useState(currentUserId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleItem(itemId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function setPrice(itemId: number, value: string) {
    setPrices((prev) => ({ ...prev, [itemId]: value }));
  }

  function parseCents(value: string): number | null {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return null;
    return Math.round(num * 100);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const purchaseItems: { itemId: number; priceCents: number }[] = [];

    for (const itemId of selected) {
      const raw = prices[itemId];
      if (!raw || raw.trim() === "") {
        setError("Enter a price for every selected item.");
        return;
      }
      const cents = parseCents(raw);
      if (cents === null || cents <= 0) {
        const item = items.find((i) => i.id === itemId);
        setError(`Invalid price for "${item?.name}".`);
        return;
      }
      purchaseItems.push({ itemId, priceCents: cents });
    }

    if (purchaseItems.length === 0) {
      setError("Select at least one item.");
      return;
    }

    setSubmitting(true);
    try {
      const purchase = await createPurchase(listId, {
        payerUserId: payerId,
        items: purchaseItems,
      });
      onPurchaseCreated(purchase);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record purchase");
      setSubmitting(false);
    }
  }

  const totalCents = Array.from(selected).reduce((sum, itemId) => {
    const cents = parseCents(prices[itemId] ?? "");
    return sum + (cents ?? 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Record Purchase
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payer selector */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Who paid?
            </label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}{m.userId === currentUserId ? " (you)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Item selection + prices */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Items &amp; prices
            </label>
            <ul className="space-y-2">
              {items.map((item) => {
                const isSelected = selected.has(item.id);
                return (
                  <li
                    key={item.id}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                      isSelected ? "bg-indigo-50" : "bg-gray-50 opacity-60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleItem(item.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-900 flex-1 truncate">
                      {item.name}
                    </span>
                    {isSelected && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={prices[item.id] ?? ""}
                          onChange={(e) => setPrice(item.id, e.target.value)}
                          className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Total */}
          {totalCents > 0 && (
            <p className="text-sm text-gray-600 text-right">
              Total: <span className="font-semibold">${(totalCents / 100).toFixed(2)}</span>
            </p>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting || selected.size === 0}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving..." : "Record Purchase"}
          </button>
        </form>
      </div>
    </div>
  );
}
