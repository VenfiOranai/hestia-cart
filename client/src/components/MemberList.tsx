import type { ListMemberWithUser } from "shared";
import { removeMember } from "../api";
import { useToast } from "./Toast";

interface Props {
  members: ListMemberWithUser[];
  listId: number;
  currentUserId: number | null;
  onMemberRemoved: (userId: number) => void;
}

export default function MemberList({
  members,
  listId,
  currentUserId,
  onMemberRemoved,
}: Props) {
  const toast = useToast();

  async function handleLeave() {
    if (!currentUserId) return;
    if (!confirm("Leave this list?")) return;

    try {
      await removeMember(listId, currentUserId);
      onMemberRemoved(currentUserId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't leave list");
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Members
      </h2>
      <div className="flex items-center gap-2 flex-wrap">
        {members.map((m) => (
          <span
            key={m.id}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-white"
            style={{ backgroundColor: m.user.color }}
          >
            {m.user.name}
            {m.userId === currentUserId && " (you)"}
          </span>
        ))}
        {currentUserId && members.some((m) => m.userId === currentUserId) && (
          <button
            onClick={handleLeave}
            className="min-h-[32px] px-2 text-xs text-gray-400 hover:text-red-500"
          >
            Leave
          </button>
        )}
      </div>
    </div>
  );
}
