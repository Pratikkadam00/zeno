import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@zeno/shared": fileURLToPath(new URL("./packages/shared/src/index.ts", import.meta.url)),
      "@zeno/service-catalog": fileURLToPath(new URL("./packages/service-catalog/src/index.ts", import.meta.url))
    }
  },
  test: {
    include: [
      "apps/**/*.test.ts",
      "apps/**/*.test.tsx",
      "packages/**/*.test.ts",
      "packages/**/*.test.tsx"
    ],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Without `all`, v8 only reports files actually imported by a test run —
      // untested modules silently vanish from the report instead of counting
      // as 0%, inflating the apparent coverage percentage.
      all: true,
      include: ["apps/**/*.ts", "apps/**/*.tsx", "packages/**/*.ts", "packages/**/*.tsx"]
      // Known gap: a few dozen never-imported apps/web/*.tsx files (ones
      // importing CSS modules, or hit by a rolldown "import type" parsing
      // quirk) fail v8's raw-parse fallback for uncovered files. They're
      // logged and excluded rather than crashing the run — an upstream
      // @vitest/coverage-v8 4.x limitation, not a project misconfiguration.
    }
  }
});
