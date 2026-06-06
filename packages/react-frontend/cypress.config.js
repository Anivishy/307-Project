import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    // The Vite dev server. Override with CYPRESS_BASE_URL if you run on a
    // different port (e.g. `vite preview`).
    baseUrl: process.env.CYPRESS_BASE_URL ?? "http://localhost:5173",
    supportFile: "cypress/support/e2e.js",
    specPattern: "cypress/e2e/**/*.cy.js",
    video: false,
  },
});
