import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The domain may live in exactly two source files. Everything else must go
 * through them, so that A1 (the real domain) is a one-line change and the
 * legal links, canonical URLs, JSON-LD, sitemap and share copy can never drift
 * apart again. This test walks the shipping source and fails on any other
 * occurrence of the host.
 */
const ROOT = join(__dirname, "..");
const HOST = /zeno\.app/i;

const SOURCE_ROOTS = [
  "apps/web/app",
  "apps/web/components",
  "apps/web/lib",
  "apps/web/next.config.ts",
  "apps/mobile/app",
  "apps/mobile/src",
  "apps/mobile/app.config.ts",
  "apps/api/src",
  "packages/shared/src",
  "packages/service-catalog/src"
];

/** Files that MAY contain the host, each with the reason. */
const ALLOWED: Record<string, string> = {
  "apps/web/lib/site.ts": "the web source of truth (DEFAULT_SITE_URL)",
  "apps/mobile/src/config/site.ts": "the mobile source of truth (DEFAULT_SITE_URL)",
  "apps/api/src/routes/auth.ts":
    "RESEND_FROM_EMAIL dev-only default; production sets the env var (A3) and the API has no site-URL concept"
};

const SKIP_DIR = new Set(["node_modules", ".next", "dist", "build", "coverage", ".expo", "android", "ios"]);
const SKIP_FILE = /\.(test|rntest)\.[cm]?[jt]sx?$|\.d\.ts$/;

function* walk(path: string): Generator<string> {
  const st = statSync(path);
  if (st.isFile()) {
    if (!SKIP_FILE.test(path) && /\.[cm]?[jt]sx?$/.test(path)) yield path;
    return;
  }
  for (const entry of readdirSync(path)) {
    if (SKIP_DIR.has(entry)) continue;
    yield* walk(join(path, entry));
  }
}

describe("site-url guard: the domain lives in two files", () => {
  it("no shipping source outside the allowlist mentions the host", () => {
    const offenders: string[] = [];
    for (const root of SOURCE_ROOTS) {
      for (const file of walk(join(ROOT, root))) {
        const rel = relative(ROOT, file).split(sep).join("/");
        if (rel in ALLOWED) continue;
        const text = readFileSync(file, "utf8");
        if (!HOST.test(text)) continue;
        const lines = text.split("\n").map((l, i) => (HOST.test(l) ? `${i + 1}: ${l.trim().slice(0, 90)}` : null)).filter(Boolean);
        offenders.push(`${rel}\n    ${lines.join("\n    ")}`);
      }
    }
    expect(offenders, `Route these through lib/site.ts (web) or src/config/site.ts (mobile):\n${offenders.join("\n")}`).toEqual([]);
  });

  it("the two sources of truth still exist and still carry the default", () => {
    for (const rel of ["apps/web/lib/site.ts", "apps/mobile/src/config/site.ts"]) {
      const text = readFileSync(join(ROOT, rel), "utf8");
      expect(text, rel).toMatch(/DEFAULT_SITE_URL = "https:\/\/zeno\.app"/);
    }
  });

  it("every allowlisted file states a reason", () => {
    for (const [file, reason] of Object.entries(ALLOWED)) expect(reason.length, file).toBeGreaterThan(20);
  });
});
