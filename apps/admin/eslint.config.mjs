import { next } from "@drawmytrip/eslint-config";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  ...next,
  {
    // Vendored shadcn primitives follow upstream shape; skip on regenerable files.
    files: ["src/components/ui/**"],
    rules: {
      "react/prefer-read-only-props": "off",
      "jsx-a11y/heading-has-content": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "ci-results/**",
  ]),
]);
