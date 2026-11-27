import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Tests import server modules directly; neutralize the bundler guard.
      "server-only": fileURLToPath(new URL("./test/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    reporters: process.env.CI ? ["default", "json"] : ["default"],
    outputFile: { json: "ci-results/test-results.json" },
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["**/*.test.*", "src/index.ts"],
      reporter: ["text", "json", "json-summary", "lcov"],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});
