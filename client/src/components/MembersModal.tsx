import type { ListMemberWithUser } from "shared";
import { removeMember } from "../api";
import { useToast } from "./Toast";

interface Props {
  members: ListMemberWithUser[];
  listId: number;
  currentUserId: number | null;
  onClose: () => void;
  onMemberRemoved: (userId: number) => void;
}

export default function MembersModal({
  members,
  listId,
  currentUserId,
  onClose,
  onMemberRemoved,
}: Props) {
  const toast = useToast();
  const isMember =
    currentUserId != null && members.some((m) => m.userId === currentUserId);

  async function handleLeave() {
    if (!currentUserId) return;
    if (!confirm("Leave this list?")) return;

    try {
      await removeMember(listId, currentUserId);
      onMemberRemoved(currentUserId);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't leave list");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Members</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg"
          >
            &times;
          </button>
        </div>

        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2 bg-gray-50"
            >
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white shrink-0"
                style={{ backgroundColor: m.user.color }}
              >
                {m.user.name.charAt(0).toUpperCase()}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {m.user.name}
                {m.userId === currentUserId && (
                  <span className="text-gray-400 font-normal"> (you)</span>
                )}
              </span>
            </li>
          ))}
        </ul>

        {isMember && (
          <button
            onClick={handleLeave}
            className="w-full rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
          >
            Leave list
          </button>
        )}
      </div>
    </div>
  );
}
