import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@subradar/shared": fileURLToPath(new URL("./packages/shared/src/index.ts", import.meta.url)),
      "@subradar/service-catalog": fileURLToPath(new URL("./packages/service-catalog/src/index.ts", import.meta.url))
    }
  },
  test: {
    include: [
      "apps/**/*.test.ts",
      "packages/**/*.test.ts"
    ],
    environment: "node"
  }
});
