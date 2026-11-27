import { defineConfig } from "vitest/config";

export default defineConfig({
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
