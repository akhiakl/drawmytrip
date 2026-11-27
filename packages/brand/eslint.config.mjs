import { base } from "@drawmytrip/eslint-config";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  ...base,
  globalIgnores(["coverage/**", "ci-results/**"]),
]);
