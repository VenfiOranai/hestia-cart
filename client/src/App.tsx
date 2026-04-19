import { useEffect, useState } from "react";
import type { HealthResponse } from "shared";

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: HealthResponse) => setHealth(data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Hestia Cart</h1>
        <p className="text-gray-500 mb-6">Shared grocery lists, fair splitting.</p>

        <div className="border rounded-lg p-4 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Server Health
          </h2>
          {error && (
            <p className="text-red-600 font-mono text-sm">Error: {error}</p>
          )}
          {health && (
            <div className="space-y-1">
              <p className="text-green-600 font-semibold">
                Status: {health.status}
              </p>
              <p className="text-gray-500 text-sm font-mono">
                {health.timestamp}
              </p>
            </div>
          )}
          {!health && !error && (
            <p className="text-gray-400 text-sm">Connecting...</p>
          )}
        </div>
      </div>
    </div>
  );
}
