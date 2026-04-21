import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addMember, createUser, getListByShareToken } from "../api";
import { JoinPageSkeleton } from "../components/Skeleton";
import type { ListWithDetails, User } from "shared";

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

function getSavedUser(): User | null {
  const raw = localStorage.getItem("hestia-user");
  return raw ? JSON.parse(raw) : null;
}

export default function JoinPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();

  const [list, setList] = useState<ListWithDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const savedUser = getSavedUser();

  useEffect(() => {
    if (!shareToken) return;
    getListByShareToken(shareToken)
      .then((fetched) => {
        setList(fetched);

        // If the saved user is already a member, go straight to the list.
        const saved = getSavedUser();
        if (saved && fetched.members.some((m) => m.userId === saved.id)) {
          navigate(`/list/${fetched.id}`, { replace: true });
        }
      })
      .catch((err) => setLoadError(err.message));
  }, [shareToken, navigate]);

  /** Join as a returning user (already have a saved identity). */
  async function handleRejoin() {
    if (!list || !savedUser) return;
    setJoining(true);
    setJoinError(null);

    try {
      await addMember(list.id, savedUser.id);
      navigate(`/list/${list.id}`);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Failed to join");
      setJoining(false);
    }
  }

  /** Join as a new user (create user, then add as member). */
  async function handleJoinNew(e: React.FormEvent) {
    e.preventDefault();
    if (!list || !name.trim()) return;
    setJoining(true);
    setJoinError(null);

    try {
      const user = await createUser({ name: name.trim(), color });
      await addMember(list.id, user.id);
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
    return <JoinPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900">
          Join "{list.name}"
        </h1>
        <p className="text-sm text-gray-500">
          {list.members.length} member{list.members.length !== 1 && "s"} already
          here
        </p>
      </div>

      {/* If we have a saved identity, offer quick rejoin */}
      {savedUser && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-sm text-gray-700">
            Join as{" "}
            <span className="font-semibold" style={{ color: savedUser.color }}>
              {savedUser.name}
            </span>
            ?
          </p>
          <button
            onClick={handleRejoin}
            disabled={joining}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {joining ? "Joining..." : "Join as " + savedUser.name}
          </button>
          {joinError && <p className="text-red-600 text-sm">{joinError}</p>}
        </div>
      )}

      {/* Divider when both options are shown */}
      {savedUser && (
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-gray-200" />
          <span className="text-xs text-gray-400">or join as someone new</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>
      )}

      {/* New user form */}
      <form onSubmit={handleJoinNew} className="space-y-4">
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
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                className={`w-10 h-10 rounded-full border-2 transition-all ${
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

        {!savedUser && joinError && (
          <p className="text-red-600 text-sm">{joinError}</p>
        )}
      </form>
    </div>
  );
}
