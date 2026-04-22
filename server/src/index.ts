import { createServer } from "node:http";
import { buildApp } from "./app.js";
import { attachWebSocketServer } from "./ws.js";

const app = buildApp();
const PORT = process.env.PORT ?? 3001;

// Create a raw HTTP server so we can attach the WebSocket server to the same port.
const httpServer = createServer(app);
attachWebSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws?listId=...`);
});
