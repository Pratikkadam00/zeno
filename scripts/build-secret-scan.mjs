#!/usr/bin/env node
// P4.4: no non-public environment value reaches the website's build output.
//
// Next.js copies NEXT_PUBLIC_* values into the build by design; anything else
// must stay out, whether by a `process.env.X` in a client component, a value
// rendered into a prerendered page, `env` in next.config, or anything else. A
// pattern scan can't recognise a value it has never seen, so this plants one:
// it builds the site with every other environment name the repository knows
// set to a fresh random canary, then searches every byte under apps/web/.next
// for each canary, as written and base64-encoded. Any hit fails, naming the
// variable and the file.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

// Public by design: the frameworks copy these into the client on purpose.
const PUBLIC_PREFIXES = ["NEXT_PUBLIC_", "EXPO_PUBLIC_"];
// Not secrets, and the build needs their real values (a canary would change
// how it builds, not test it).
const BUILD_CONTROLS = new Set(["NODE_ENV", "BABEL_ENV", "CI", "TZ"]);

const NAME_PATTERNS = [
  /process\.env\.([A-Z][A-Z0-9_]*)/g,
  /process\.env\[["'`]([A-Z][A-Z0-9_]*)["'`]\]/g,
  /^\s*-\s*key:\s*([A-Z][A-Z0-9_]*)/gm, // render.yaml
  /^([A-Z][A-Z0-9_]*)=/gm, // .env.example
  /\bsecrets\.([A-Z][A-Z0-9_]*)/g // workflows
];

/** Every environment name in the given files' text. Exported for tests. */
export function namesIn(texts) {
  const names = new Set();
  for (const text of texts) for (const re of NAME_PATTERNS) for (const m of text.matchAll(re)) names.add(m[1]);
  return names;
}

/** The names that get a canary: everything but public and build-control names. Exported for tests. */
export function canaryNames(names) {
  return [...names].filter((n) => !BUILD_CONTROLS.has(n) && !PUBLIC_PREFIXES.some((p) => n.startsWith(p))).sort();
}

/** A fresh canary per name: letters and digits only, so escaping can't change it. Exported for tests. */
export function makeCanaries(names, nonce = randomBytes(6).toString("hex")) {
  return Object.fromEntries(names.map((n) => [n, `zncanary${n.replace(/_/g, "").toLowerCase()}${nonce}`]));
}

/**
 * The byte strings that betray a canary: as written, and base64-encoded at each
 * of the three alignments (the stable middle of each encoding). Exported for tests.
 */
export function needles(canary) {
  const out = [Buffer.from(canary)];
  for (let pad = 0; pad < 3; pad++) {
    const b64 = Buffer.concat([Buffer.alloc(pad, 0x20), Buffer.from(canary)]).toString("base64");
    // Drop the characters that depend on the bytes around the canary.
    const start = Math.ceil((pad * 4) / 3) + 1;
    out.push(Buffer.from(b64.slice(start, b64.length - 4)));
  }
  return out;
}

// A byte search sees a value only in a file that stores it as bytes. Every kind
// of file the build writes was listed (P4.4): all text but the fonts. A kind
// not on this list (Turbopack's compressed .sst cache, say) fails the scan
// rather than being passed unread.
const READABLE = new Set([
  ".rsc", ".meta", ".html", ".js", ".json", ".map", ".ts", ".css", ".body",
  ".tsbuildinfo", ".rscinfo", ".previewinfo"
]);
// Not text, but not a hiding place either: next/font's subsets of the fonts we
// ship, compressed font files whose bytes come from the font, not the build.
const OPAQUE_BY_DESIGN = new Set([".woff2"]);
// Text files with no extension (Next's BUILD_ID and build traces).
const NO_EXTENSION_TEXT = new Set(["BUILD_ID", "trace", "trace-build", "turbopack"]);

/** "readable", "opaque" (reviewed, skipped) or "unknown" for a file name. Exported for tests. */
export function kindOf(fileName) {
  const dot = fileName.lastIndexOf(".");
  const ext = dot > 0 ? fileName.slice(dot).toLowerCase() : dot === 0 ? fileName.toLowerCase() : "";
  if (ext === "") return NO_EXTENSION_TEXT.has(fileName) ? "readable" : "unknown";
  if (READABLE.has(ext)) return "readable";
  return OPAQUE_BY_DESIGN.has(ext) ? "opaque" : "unknown";
}

/**
 * Under `dir`: each [name, file] where a canary appears, and every file of a
 * kind the search can't read. Exported for tests.
 */
export function findCanaries(dir, canaries) {
  const hits = [];
  const unreadable = [];
  const searches = Object.entries(canaries).map(([name, value]) => [name, needles(value)]);
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      const p = join(d, entry);
      if (statSync(p).isDirectory()) {
        walk(p);
        continue;
      }
      const kind = kindOf(entry);
      if (kind === "opaque") continue;
      if (kind === "unknown") unreadable.push(p);
      const bytes = readFileSync(p);
      for (const [name, list] of searches) if (list.some((n) => bytes.includes(n))) hits.push([name, p]);
    }
  };
  walk(dir);
  return { hits, unreadable };
}

/** The environment names in every file git tracks that could name one. Exported for tests. */
export function repositoryNames() {
  const files = spawnSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).stdout.split("\n").filter(Boolean);
  const relevant = files.filter(
    (f) => /\.(c|m)?[jt]sx?$/.test(f) || f === "render.yaml" || /(^|\/)\.env[^/]*example[^/]*$/.test(f) || f.startsWith(".github/")
  );
  return namesIn(relevant.map((f) => readFileSync(join(ROOT, f), "utf8")));
}

function main() {
  const names = canaryNames(repositoryNames());
  const canaries = makeCanaries(names);
  console.log(`build-secret-scan: building the website with ${names.length} canaries: ${names.join(" ")}`);
  // From an empty .next: the scan judges this build alone. (Next keeps files
  // from earlier builds, e.g. a Turbopack cache written before F186 turned it
  // off, which would otherwise be blamed here, or sit unexamined.)
  rmSync(join(ROOT, "apps", "web", ".next"), { recursive: true, force: true });
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const build = spawnSync(npm, ["run", "build", "--workspace", "@zeno/web"], {
    cwd: ROOT,
    env: { ...process.env, ...canaries },
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  if (build.status !== 0) {
    console.error("build-secret-scan: the build failed");
    process.exit(1);
  }
  const { hits, unreadable } = findCanaries(join(ROOT, "apps", "web", ".next"), canaries);
  for (const [name, file] of hits) console.error(`::error file=${file}::the value of ${name} is in the build output`);
  for (const file of unreadable) console.error(`::error file=${file}::a kind of file this scan can't read (review it, then list it in scripts/build-secret-scan.mjs)`);
  if (hits.length > 0 || unreadable.length > 0) process.exit(1);
  console.log(`build-secret-scan: PASS, none of the ${names.length} values is anywhere in apps/web/.next`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
