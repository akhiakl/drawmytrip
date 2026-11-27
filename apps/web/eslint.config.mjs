import { next } from "@drawmytrip/eslint-config";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...next,
  {
    rules: {
      // Domain boundaries: consume lib domains through their public API.
      // The negated patterns are the documented server-only entry points.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/*/*",
                "!@/lib/trip/service",
                "!@/lib/ai/generate",
                "!@/lib/ai/suggest",
              ],
              message:
                "Import via the domain's public API (e.g. @/lib/trip). Deep imports are limited to documented server entry points.",
            },
          ],
        },
      ],
    },
  },
  {
    // Vendored shadcn primitives follow upstream shape; skip on regenerable files.
    files: ["src/components/ui/**"],
    rules: {
      "react/prefer-read-only-props": "off",
      // Headings get their text through spread `children`.
      "jsx-a11y/heading-has-content": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "coverage/**"]),
]);

export default eslintConfig;
