import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The app may not lead anyone to the website's checkout.
 *
 * Google Play's Payments policy requires Play's billing system for digital
 * purchases made inside the app, and separately forbids leading users to any
 * other payment method from inside it. Selling Pro on the website is allowed
 * because that purchase happens outside the app — but a link, a price, or even
 * a mention of the web checkout inside the app is the thing the policy names,
 * and the penalty is removal of a published app.
 *
 * That makes this a rail rather than a note in a document: the decision is a
 * year old by the time someone adds an innocent-looking "upgrade on our site"
 * button, and nothing else in the repository would stop them. D24 in
 * docs/OWNER_ACTIONS.md; the design is docs/RAZORPAY_WEB_CHECKOUT.md.
 */
const ROOT = join(__dirname, "..");

/** Anything that would point a reader of the app at paying somewhere else. */
const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /razorpay/i, why: "names the web gateway" },
  { pattern: /\/pro\/checkout|\/checkout\b/i, why: "links the web checkout route" },
  { pattern: /\bupi\b/i, why: "offers a payment method Play does not process" },
  { pattern: /buy (it )?(on|at|from) (our|the) (site|website)/i, why: "steers to the website" },
  { pattern: /cheaper on the web|save \d+% on the web/i, why: "prices the web path inside the app" }
];

// The whole mobile app, including its config: a deep link or an intent filter
// would steer just as effectively as a button.
const SOURCE_ROOTS = ["apps/mobile/app", "apps/mobile/src", "apps/mobile/app.config.ts"];

const SKIP_DIR = new Set(["node_modules", ".expo", "android", "ios", "coverage", "dist", "build"]);
// Tests are excluded for the same reason the site-url guard excludes them: a
// test may legitimately assert that something is absent.
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

describe("Play steering guard: the app never points at the web checkout", () => {
  it("no screen, component or config mentions the web payment path", () => {
    const offenders: string[] = [];
    for (const root of SOURCE_ROOTS) {
      for (const file of walk(join(ROOT, root))) {
        const rel = relative(ROOT, file).split(sep).join("/");
        const text = readFileSync(file, "utf8");
        for (const { pattern, why } of FORBIDDEN) {
          if (!pattern.test(text)) continue;
          const line = text.split("\n").findIndex((l) => pattern.test(l)) + 1;
          offenders.push(`${rel}:${line} — ${why} (${pattern})`);
        }
      }
    }
    expect(
      offenders,
      `Google Play forbids leading users to another payment method from inside the app.\n` +
        `Sell it through Play billing in the app, or not at all in the app:\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  it("actually walks the app — a guard that scans nothing passes too", () => {
    let scanned = 0;
    for (const root of SOURCE_ROOTS) for (const _ of walk(join(ROOT, root))) scanned += 1;
    // 117 files when this was written; the floor only catches a walk that broke.
    expect(scanned).toBeGreaterThan(80);
  });

  it("the guard would actually catch a steering link", () => {
    // A guard nobody has seen fail is a guard nobody knows works.
    const tempting = 'Pressable onPress={() => Linking.openURL("https://example.com/pro/checkout")}';
    expect(FORBIDDEN.some(({ pattern }) => pattern.test(tempting))).toBe(true);
    expect(FORBIDDEN.some(({ pattern }) => pattern.test("Pay with UPI and save"))).toBe(true);
    expect(FORBIDDEN.some(({ pattern }) => pattern.test("Buy it on our website"))).toBe(true);
  });

  it("does not fire on the ordinary in-app purchase copy it has to live beside", () => {
    const allowed = [
      "Upgrade to Pro",
      "Restore purchases",
      "Manage your subscription in Google Play",
      "7-day free trial, then $6.99/month"
    ];
    for (const line of allowed) {
      expect(FORBIDDEN.filter(({ pattern }) => pattern.test(line)), line).toEqual([]);
    }
  });
});
