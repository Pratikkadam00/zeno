import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// P8.9: docs/STORE_DATA_SAFETY.md drafts the Play data-safety form from what the
// release build sends off the phone. These checks fail when the code drifts from
// the draft: a new product event, bank connection reaching release builds, or a
// cited file that no longer exists.
const ROOT = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const doc = read("docs/STORE_DATA_SAFETY.md");

describe("docs/STORE_DATA_SAFETY.md", () => {
  it("names every product event the app can send, and no other", () => {
    const union = /export type FunnelEvent = ([^;]+);/.exec(read("apps/mobile/src/api/client.ts"))![1]!;
    const events = [...union.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]!);
    expect(events.length).toBeGreaterThan(0);
    const row = doc.split("\n").find((line) => line.includes("product events"))!;
    const listed = [...row.matchAll(/`([a-z_]+)`/g)].map((m) => m[1]!).filter((name) => events.includes(name) || /^[a-z]+(_[a-z]+)+$/.test(name));
    expect(listed.sort()).toEqual([...events].sort());
  });

  it("bank connection stays out of release builds, as the draft says", () => {
    expect(read("apps/mobile/app/open-banking.tsx")).toContain("return __DEV__ ? <OpenBankingScreen /> : <NotInThisBuild />;");
  });

  it("every file it cites as evidence exists", () => {
    const BASES = ["", "apps/mobile/", "apps/mobile/src/monitoring/", "docs/"];
    const cited = [...new Set([...doc.matchAll(/`([^`\s]+\.(?:ts|tsx|md))`/g)].map((m) => m[1]!))];
    expect(cited.length).toBeGreaterThan(8);
    expect(cited.filter((p) => !BASES.some((base) => existsSync(resolve(ROOT, base + p))))).toEqual([]);
  });
});
