import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addMember, createList } from "../api";
import type { User } from "shared";

function getSavedUser(): User | null {
  const raw = localStorage.getItem("hestia-user");
  return raw ? JSON.parse(raw) : null;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [listName, setListName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savedUser = getSavedUser();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!listName.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const list = await createList({ name: listName.trim() });

      // Auto-add the creator as a member if we have a saved identity.
      if (savedUser) {
        await addMember(list.id, savedUser.id);
      }

      navigate(`/list/${list.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create list");
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Hestia Cart
        </h1>
        <p className="text-gray-500">
          Shared grocery lists, fair splitting.
        </p>
        {savedUser && (
          <p className="text-sm text-gray-400 mt-2">
            Logged in as{" "}
            <span
              className="font-semibold"
              style={{ color: savedUser.color }}
            >
              {savedUser.name}
            </span>
          </p>
        )}
      </div>

      {/* Create a new list */}
      <form onSubmit={handleCreate} className="space-y-3">
        <label
          htmlFor="list-name"
          className="block text-sm font-medium text-gray-700"
        >
          Start a new list
        </label>
        <div className="flex gap-2">
          <input
            id="list-name"
            type="text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="e.g. Weekly Groceries"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={creating || !listName.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>
    </div>
  );
}
