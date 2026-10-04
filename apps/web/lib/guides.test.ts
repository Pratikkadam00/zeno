import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { INDEX_GENERAL_GUIDES } from "./guides";

// The D16 switch is read by the website's sitemap and guide pages (tested in
// vitest.web.config.ts). This keeps the owner's decision record in step with
// the setting: whoever flips the switch must say so in OWNER_ACTIONS.md.
describe("INDEX_GENERAL_GUIDES (D16)", () => {
  it("is a boolean, and docs/OWNER_ACTIONS.md records the current setting", () => {
    expect(typeof INDEX_GENERAL_GUIDES).toBe("boolean");
    const doc = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../../../docs/OWNER_ACTIONS.md"), "utf8");
    const d16 = doc.slice(doc.indexOf("### D16"), doc.indexOf("### D15"));
    expect(d16.length).toBeGreaterThan(200);
    expect(d16).toContain(INDEX_GENERAL_GUIDES ? "(a) keep them indexed (today's setting)" : "(b) keep them on the site and linked but\ntell search engines not to index them (today's setting)");
  });
});
