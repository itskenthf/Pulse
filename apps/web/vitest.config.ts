import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // e2e/ is Playwright's own suite (test:e2e), not a Vitest one — it
    // imports @playwright/test's `test`, which errors if collected here.
    exclude: ["**/node_modules/**", "e2e/**"],
  },
});
