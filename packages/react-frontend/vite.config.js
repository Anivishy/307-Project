import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, configDir, "");
  const backendProxyTarget =
    env.VITE_BACKEND_PROXY_TARGET ??
    env.VITE_API_PROXY_TARGET ??
    "http://127.0.0.1:3000";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(configDir, "src"),
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
  };
});
