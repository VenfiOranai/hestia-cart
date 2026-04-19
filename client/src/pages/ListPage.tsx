import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getList } from "../api";
import type { ListWithDetails } from "shared";

export default function ListPage() {
  const { id } = useParams<{ id: string }>();
  const [list, setList] = useState<ListWithDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{list.name}</h1>
        <p className="text-sm text-gray-500">
          {list.members.length} member{list.members.length !== 1 && "s"} &middot;{" "}
          {list.items.length} item{list.items.length !== 1 && "s"}
        </p>
      </div>

      {/* Item list — placeholder for M5 */}
      {list.items.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">
          No items yet. Add one to get started.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 border rounded-lg bg-white">
          {list.items.map((item) => (
            <li
              key={item.id}
              className="px-4 py-3 flex items-center justify-between"
            >
              <span className="text-gray-900">{item.name}</span>
              <span className="text-xs text-gray-400 capitalize">
                {item.cartState}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Members */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Members
        </h2>
        <div className="flex gap-2 flex-wrap">
          {list.members.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white"
              style={{ backgroundColor: m.user.color }}
            >
              {m.user.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
