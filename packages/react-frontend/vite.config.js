import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const backendProxyTarget =
  process.env.VITE_BACKEND_PROXY_TARGET ?? "http://127.0.0.1:3000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(srcDir, "src"),
    },
  },
  server: {
    proxy: {
      "/api": backendProxyTarget,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
  },
});
