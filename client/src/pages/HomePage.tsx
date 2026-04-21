import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addMember, createList, createUser, getUserLists } from "../api";
import type { ListSummary, User } from "shared";

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

export default function HomePage() {
  const navigate = useNavigate();
  const [savedUser, setSavedUser] = useState<User | null>(getSavedUser);

  // Login form state
  const [loginName, setLoginName] = useState("");
  const [loginColor, setLoginColor] = useState(COLORS[0]);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Create list state
  const [listName, setListName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // My lists
  const [myLists, setMyLists] = useState<ListSummary[]>([]);
  const [listsLoading, setListsLoading] = useState(false);

  // Fetch the user's lists whenever identity changes
  useEffect(() => {
    if (!savedUser) {
      setMyLists([]);
      return;
    }
    setListsLoading(true);
    getUserLists(savedUser.id)
      .then(setMyLists)
      .catch(() => setMyLists([]))
      .finally(() => setListsLoading(false));
  }, [savedUser]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginName.trim()) return;
    setLoggingIn(true);
    setLoginError(null);

    try {
      const user = await createUser({ name: loginName.trim(), color: loginColor });
      localStorage.setItem("hestia-user", JSON.stringify(user));
      setSavedUser(user);
      setLoginName("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setLoggingIn(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("hestia-user");
    setSavedUser(null);
  }

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault();
    if (!listName.trim() || !savedUser) return;
    setCreating(true);
    setCreateError(null);

    try {
      const list = await createList({ name: listName.trim() });
      await addMember(list.id, savedUser.id);
      navigate(`/list/${list.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create list");
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Hestia Cart</h1>
        <p className="text-gray-500">Shared grocery lists, fair splitting.</p>
      </div>

      {/* Identity section */}
      {savedUser ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: savedUser.color }}
            />
            <span className="text-sm font-medium text-gray-900">
              {savedUser.name}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Log out
          </button>
        </div>
      ) : (
        <form onSubmit={handleLogin} className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Create your identity
          </label>
          <input
            type="text"
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Pick a color
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setLoginColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    loginColor === c
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
            disabled={loggingIn || !loginName.trim()}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loggingIn ? "Creating..." : "Log in"}
          </button>
          {loginError && <p className="text-red-600 text-sm">{loginError}</p>}
        </form>
      )}

      {/* Create a new list */}
      <form onSubmit={handleCreateList} className="space-y-3">
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
            placeholder={savedUser ? "e.g. Weekly Groceries" : "Log in first"}
            disabled={!savedUser}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            type="submit"
            disabled={creating || !listName.trim() || !savedUser}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
        {createError && <p className="text-red-600 text-sm">{createError}</p>}
      </form>

      {/* My lists */}
      {savedUser && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-gray-700">My lists</h2>
          {listsLoading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : myLists.length === 0 ? (
            <p className="text-sm text-gray-400">
              No lists yet. Create one or join via a share link.
            </p>
          ) : (
            <ul className="space-y-2">
              {myLists.map((list) => (
                <li key={list.id}>
                  <Link
                    to={`/list/${list.id}`}
                    className="block rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {list.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {list.memberCount} member{list.memberCount !== 1 && "s"} &middot;{" "}
                      {list.itemCount} item{list.itemCount !== 1 && "s"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
