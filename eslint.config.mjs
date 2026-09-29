import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Apps Script source (gas/Code.js). It runs on Google's V8 runtime, not Node: `doPost`/`doGet`
    // are entry points Google calls by name, so every linter sees them as unused. The same exclusion
    // lives in .oxlintrc.json (the `pnpm lint` runner).
    "gas/**",
  ]),
]);

export default eslintConfig;
