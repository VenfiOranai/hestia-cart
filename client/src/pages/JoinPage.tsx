import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addMember, createUser, getListByShareToken } from "../api";
import type { ListWithDetails } from "shared";

const COLORS = [
  "#4f46e5", // indigo
  "#059669", // emerald
  "#d97706", // amber
  "#dc2626", // red
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#c026d3", // fuchsia
  "#65a30d", // lime
];

export default function JoinPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();

  const [list, setList] = useState<ListWithDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareToken) return;
    getListByShareToken(shareToken)
      .then(setList)
      .catch((err) => setLoadError(err.message));
  }, [shareToken]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!list || !name.trim()) return;
    setJoining(true);
    setJoinError(null);

    try {
      const user = await createUser({ name: name.trim(), color });
      await addMember(list.id, user.id);

      // Save identity locally so the app remembers who we are.
      localStorage.setItem("hestia-user", JSON.stringify(user));

      navigate(`/list/${list.id}`);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Failed to join");
      setJoining(false);
    }
  }

  if (loadError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-medium">{loadError}</p>
        <p className="text-sm text-gray-500 mt-1">
          This share link may be invalid or expired.
        </p>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900">
          Join "{list.name}"
        </h1>
        <p className="text-sm text-gray-500">
          {list.members.length} member{list.members.length !== 1 && "s"} already here
        </p>
      </div>

      <form onSubmit={handleJoin} className="space-y-4">
        <div>
          <label
            htmlFor="user-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Your name
          </label>
          <input
            id="user-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alice"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pick a color
          </label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-9 h-9 rounded-full border-2 transition-all ${
                  color === c
                    ? "border-gray-900 scale-110"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={joining || !name.trim()}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {joining ? "Joining..." : "Join list"}
        </button>

        {joinError && <p className="text-red-600 text-sm">{joinError}</p>}
      </form>
    </div>
  );
}
