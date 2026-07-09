// Plain TypeScript ESLint config for the non-framework workspaces (apps/api,
// packages/*). apps/web and apps/mobile have their own eslint.config files
// (Next.js / Expo specific) and are excluded here so they're never
// double-linted with the wrong rule set.
// https://typescript-eslint.io/getting-started/
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "apps/web/**",
    "apps/mobile/**",
    "**/node_modules/**",
    "**/dist/**",
    "**/.next/**",
    "**/coverage/**",
    "**/*.d.ts"
  ]),
  {
    files: ["apps/api/**/*.ts", "packages/*/src/**/*.ts", "scripts/**/*.mjs"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node
    },
    rules: {
      // Matches this codebase's existing convention (e.g. digestStringAsync's
      // "_algo" param, callback signatures that must match an external
      // interface) — an intentionally-unused arg/var is prefixed with "_".
      // ignoreRestSiblings covers the "extract and discard via destructuring"
      // idiom (e.g. `({ version, seq, ...change }) => change`), which isn't
      // dead code — it's how a field is deliberately omitted from an object.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }
      ]
    }
  }
]);
