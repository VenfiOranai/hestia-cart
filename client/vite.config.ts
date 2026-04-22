import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxy target is overridable via VITE_API_TARGET so the Playwright harness can
// point the dev server at an ephemeral Express instance on a non-default port.
const apiTarget = process.env.VITE_API_TARGET ?? "http://localhost:3001";
const wsTarget = apiTarget.replace(/^http/, "ws");

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
      "/ws": {
        target: wsTarget,
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
