import { useState } from "react";
import type { ItemWithDetails, ListMemberWithUser } from "shared";
import { addExclusion, removeExclusion } from "../api";

interface Props {
  item: ItemWithDetails;
  members: ListMemberWithUser[];
  onClose: () => void;
  onUpdated: (item: ItemWithDetails) => void;
}

export default function ExclusionModal({
  item,
  members,
  onClose,
  onUpdated,
}: Props) {
  // Track which userIds are currently excluded, starting from the item's data.
  const [excludedIds, setExcludedIds] = useState<Set<number>>(
    new Set(item.exclusions.map((e) => e.userId))
  );
  const [saving, setSaving] = useState<number | null>(null);

  async function handleToggle(userId: number) {
    setSaving(userId);
    const isExcluded = excludedIds.has(userId);

    try {
      if (isExcluded) {
        await removeExclusion(item.id, userId);
        setExcludedIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
        // Update parent with the exclusion removed
        onUpdated({
          ...item,
          exclusions: item.exclusions.filter((e) => e.userId !== userId),
        });
      } else {
        const exclusion = await addExclusion(item.id, { userId });
        setExcludedIds((prev) => new Set(prev).add(userId));
        onUpdated({
          ...item,
          exclusions: [...item.exclusions, exclusion],
        });
      }
    } catch {
      // M8 will add toasts
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Split: {item.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg"
          >
            &times;
          </button>
        </div>

        <p className="text-xs text-gray-500">
          Checked members split the cost. Uncheck someone to exclude them.
        </p>

        <ul className="space-y-2">
          {members.map((m) => {
            const excluded = excludedIds.has(m.userId);
            const isSaving = saving === m.userId;
            return (
              <li key={m.userId}>
                <label
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                    excluded
                      ? "bg-gray-50 text-gray-400"
                      : "bg-white hover:bg-gray-50 text-gray-900"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!excluded}
                    onChange={() => handleToggle(m.userId)}
                    disabled={isSaving}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: m.user.color }}
                  />
                  <span className="text-sm font-medium">
                    {m.user.name}
                  </span>
                  {excluded && (
                    <span className="text-xs text-orange-500 ml-auto">
                      excluded
                    </span>
                  )}
                  {isSaving && (
                    <span className="text-xs text-gray-400 ml-auto">
                      saving...
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>

        <button
          onClick={onClose}
          className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Done
        </button>
      </div>
    </div>
  );
}
