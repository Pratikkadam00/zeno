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
      reporter: ["text", "html"]
    }
  }
});
