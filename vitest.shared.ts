import type { Plugin, UserConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Shared by vitest.config.ts (logic) and vitest.web.config.ts (the website's
// components and pages), so both runs resolve modules identically.

export const sharedResolve: UserConfig["resolve"] = {
  alias: {
    "@zeno/shared": fileURLToPath(new URL("./packages/shared/src/index.ts", import.meta.url)),
    "@zeno/service-catalog": fileURLToPath(new URL("./packages/service-catalog/src/index.ts", import.meta.url))
  }
};

// The website imports its own files as "@/…" (apps/web/tsconfig.json paths).
// Resolved here ONLY for importers inside apps/web: apps/mobile's tsconfig maps
// the same prefix to its src/, so a global alias would silently point a mobile
// file at the website.
const webRoot = fileURLToPath(new URL("./apps/web/", import.meta.url));
export const webAtAlias: Plugin = {
  name: "zeno-web-at-alias",
  enforce: "pre",
  resolveId(source, importer, options) {
    if (!source.startsWith("@/") || !importer) return null;
    if (!importer.replace(/\\/g, "/").includes("/apps/web/")) return null;
    return this.resolve(webRoot + source.slice(2), importer, { ...options, skipSelf: true });
  }
};
