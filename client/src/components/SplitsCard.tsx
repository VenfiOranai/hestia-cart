import { useEffect, useState } from "react";
import type { SplitsResponse } from "shared";
import { getSplits } from "../api";
import { Skeleton } from "./Skeleton";

interface Props {
  listId: number;
  /** Bumped whenever a new purchase is recorded, to trigger a refetch. */
  refreshKey: number;
}

export default function SplitsCard({ listId, refreshKey }: Props) {
  const [splits, setSplits] = useState<SplitsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getSplits(listId)
      .then(setSplits)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [listId, refreshKey]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!splits || splits.debts.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Cost Splitting</h3>
        <span className="text-xs text-gray-400">
          Total: ${(splits.totalCents / 100).toFixed(2)}
        </span>
      </div>

      <ul className="space-y-2">
        {splits.debts.map((debt, i) => (
          <li
            key={i}
            className="flex items-center gap-2 text-sm"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: debt.from.color }}
            />
            <span className="font-medium" style={{ color: debt.from.color }}>
              {debt.from.name}
            </span>
            <span className="text-gray-400">owes</span>
            <span className="font-medium" style={{ color: debt.to.color }}>
              {debt.to.name}
            </span>
            <span className="ml-auto font-semibold text-gray-900">
              ${(debt.amountCents / 100).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
