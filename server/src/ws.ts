import type { Server as HttpServer, IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { URL } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";
import type { ListEventType } from "shared";
import prisma from "./db.js";

/** Live WebSocket connections per list. */
const connections = new Map<number, Set<WebSocket>>();

/** Sockets get a `.isAlive` flag for the heartbeat loop. */
interface TrackedSocket extends WebSocket {
  isAlive?: boolean;
  listId?: number;
}

const HEARTBEAT_INTERVAL_MS = 30_000;

export function attachWebSocketServer(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Handle the HTTP Upgrade for `/ws?listId=N`.
  httpServer.on("upgrade", async (req, socket, head) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }

    const listId = Number(url.searchParams.get("listId"));
    if (!Number.isFinite(listId) || listId <= 0) {
      rejectUpgrade(socket, 400, "Invalid listId");
      return;
    }

    // Make sure the list exists before accepting the connection.
    try {
      const exists = await prisma.list.findUnique({
        where: { id: listId },
        select: { id: true },
      });
      if (!exists) {
        rejectUpgrade(socket, 404, "List not found");
        return;
      }
    } catch {
      rejectUpgrade(socket, 500, "Lookup failed");
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      registerConnection(ws as TrackedSocket, listId, req);
      wss.emit("connection", ws, req);
    });
  });

  // Heartbeat: terminate sockets that don't pong back.
  const heartbeat = setInterval(() => {
    for (const sockets of connections.values()) {
      for (const raw of sockets) {
        const ws = raw as TrackedSocket;
        if (ws.isAlive === false) {
          ws.terminate();
          continue;
        }
        ws.isAlive = false;
        ws.ping();
      }
    }
  }, HEARTBEAT_INTERVAL_MS);

  wss.on("close", () => clearInterval(heartbeat));

  return wss;
}

function registerConnection(ws: TrackedSocket, listId: number, _req: IncomingMessage) {
  ws.isAlive = true;
  ws.listId = listId;

  let bucket = connections.get(listId);
  if (!bucket) {
    bucket = new Set();
    connections.set(listId, bucket);
  }
  bucket.add(ws);

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("close", () => {
    const b = connections.get(listId);
    if (!b) return;
    b.delete(ws);
    if (b.size === 0) connections.delete(listId);
  });

  // We ignore any client-sent messages for now; mutations go through the REST API.
  ws.on("message", () => {});
}

/**
 * Send an event to every client watching a list.
 *
 * Payload is declared as `unknown` because Prisma returns `Date` instances for
 * timestamp fields while the shared `ListEvent` union describes the wire shape
 * (ISO strings). JSON serialization does the conversion for us.
 */
export function broadcast(
  listId: number,
  event: { type: ListEventType; payload: unknown },
): void {
  const bucket = connections.get(listId);
  if (!bucket || bucket.size === 0) return;
  const payload = JSON.stringify(event);
  for (const ws of bucket) {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  }
}

function rejectUpgrade(socket: Duplex, status: number, message: string) {
  socket.write(
    `HTTP/1.1 ${status} ${message}\r\n` +
      `Connection: close\r\n` +
      `Content-Length: 0\r\n` +
      `\r\n`,
  );
  socket.destroy();
}
