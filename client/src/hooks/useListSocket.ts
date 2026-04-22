import { useEffect, useRef } from "react";
import type { ListEvent } from "shared";

interface Options {
  /** Called with every parsed event from the server. */
  onEvent: (event: ListEvent) => void;
  /** Called after a reconnect succeeds (useful for catch-up fetches). */
  onReconnect?: () => void;
}

const MAX_BACKOFF_MS = 30_000;

function buildUrl(listId: number): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws?listId=${listId}`;
}

/**
 * Subscribe to a list's WebSocket event stream. Reconnects with exponential
 * backoff. The `onEvent` / `onReconnect` callbacks are read from a ref so
 * changing them doesn't tear down the connection.
 */
export function useListSocket(listId: number | null, options: Options) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (listId == null) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let backoff = 1_000;
    let closed = false;
    let hasConnectedBefore = false;

    function connect() {
      ws = new WebSocket(buildUrl(listId!));

      ws.addEventListener("open", () => {
        backoff = 1_000;
        if (hasConnectedBefore) optionsRef.current.onReconnect?.();
        hasConnectedBefore = true;
      });

      ws.addEventListener("message", (ev) => {
        try {
          const event = JSON.parse(ev.data) as ListEvent;
          optionsRef.current.onEvent(event);
        } catch {
          // Ignore malformed frames
        }
      });

      ws.addEventListener("close", () => {
        if (closed) return;
        reconnectTimer = window.setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
      });

      ws.addEventListener("error", () => {
        // `close` will fire next; we retry there.
      });
    }

    connect();

    return () => {
      closed = true;
      if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [listId]);
}
