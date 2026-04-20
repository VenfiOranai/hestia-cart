import { useState } from "react";
import { createItem } from "../api";
import type { ItemWithDetails } from "shared";

interface Props {
  listId: number;
  userId: number | null;
  onItemAdded: (item: ItemWithDetails) => void;
}

export default function AddItemForm({ listId, userId, onItemAdded }: Props) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !userId) return;
    setSubmitting(true);

    try {
      const item = await createItem(listId, {
        name: name.trim(),
        createdByUserId: userId,
      });
      onItemAdded(item);
      setName("");
    } catch {
      // Errors will be handled more gracefully in M8 (toasts).
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={userId ? "Add an item..." : "Join the list to add items"}
        disabled={!userId}
        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
      />
      <button
        type="submit"
        disabled={submitting || !name.trim() || !userId}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Add
      </button>
    </form>
  );
}
