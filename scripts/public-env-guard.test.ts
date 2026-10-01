import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * P3.6: every EXPO_PUBLIC_* value the mobile source READS is inlined into the
 * shipped JS bundle (measured: an exported Android bundle carried each
 * referenced name's value, and not an unreferenced EXPO_PUBLIC_ variable's).
 * So each name mobile code may read is reviewed here as public by design, with
 * the reason; a new one fails this test until it is reviewed. Server secrets
 * never use the prefix; app.config.test.ts proves none reaches the config.
 */
const ROOT = join(__dirname, "..");
const SOURCES = ["apps/mobile/app", "apps/mobile/src", "apps/mobile/app.config.ts"];
const NAME = /\bEXPO_PUBLIC_[A-Z0-9_]+\b/g;

const PUBLIC_BY_DESIGN: Record<string, string> = {
  EXPO_PUBLIC_SITE_URL: "the public website origin",
  EXPO_PUBLIC_SENTRY_DSN: "Sentry: \"DSNs are safe to keep public because they only allow submission of new events\" (Sentry's DSN docs)",
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: "RevenueCat's public SDK key, which \"must be used to configure the SDK\"; a secret sk_ key is refused by app.config.ts",
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: "as above, for Android",
  EXPO_PUBLIC_GOOGLE_CLIENT_ID: "an OAuth client id, sent in the clear in every Google sign-in URL",
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: "as above, for iOS",
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: "as above, for Android"
};
const SKIP_DIR = new Set(["node_modules", "android", "ios"]);
const SKIP_FILE = /\.(test|rntest)\.[cm]?[jt]sx?$|\.d\.ts$/;

function* walk(path: string): Generator<string> {
  if (statSync(path).isFile()) {
    if (!SKIP_FILE.test(path) && /\.[cm]?[jt]sx?$/.test(path)) yield path;
    return;
  }
  for (const entry of readdirSync(path)) if (!SKIP_DIR.has(entry)) yield* walk(join(path, entry));
}

function referenced(): Map<string, string[]> {
  const where = new Map<string, string[]>();
  for (const root of SOURCES) {
    for (const file of walk(join(ROOT, root))) {
      const rel = relative(ROOT, file).split(sep).join("/");
      for (const [name] of readFileSync(file, "utf8").matchAll(NAME)) {
        where.set(name, [...(where.get(name) ?? []), rel]);
      }
    }
  }
  return where;
}

describe("public-env guard: mobile reads only reviewed EXPO_PUBLIC_ names", () => {
  it("every EXPO_PUBLIC_ name in mobile source is on the reviewed list", () => {
    const unreviewed = [...referenced()].filter(([name]) => !(name in PUBLIC_BY_DESIGN)).map(([name, files]) => `${name} in ${[...new Set(files)].join(", ")}`);
    expect(unreviewed).toEqual([]);
  });

  it("the list has no stale entry (each one is still read somewhere)", () => {
    const used = referenced();
    expect(Object.keys(PUBLIC_BY_DESIGN).filter((name) => !used.has(name))).toEqual([]);
  });
});
