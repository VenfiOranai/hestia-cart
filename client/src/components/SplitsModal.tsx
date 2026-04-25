import type { SplitsResponse } from "shared";

interface Props {
  splits: SplitsResponse;
  onClose: () => void;
}

export default function SplitsModal({ splits, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Cost Splitting</h2>
          <button
            onClick={onClose}
            aria-label="Close splits"
            className="text-gray-400 hover:text-gray-600 text-lg"
          >
            &times;
          </button>
        </div>

        <p className="text-xs text-gray-400">
          Total purchased: ${(splits.totalCents / 100).toFixed(2)}
        </p>

        <ul className="space-y-2">
          {splits.debts.map((debt, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
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
    </div>
  );
}
