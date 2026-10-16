import { readFileSync } from "node:fs";
import { isGuessedCancelUrl } from "./guides";
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

describe("isGuessedCancelUrl (F242)", () => {
  it("recognises the generated '<website>/account' link, with or without a trailing slash on the website", () => {
    expect(isGuessedCancelUrl("https://www.loom.com", "https://www.loom.com/account")).toBe(true);
    expect(isGuessedCancelUrl("https://www.loom.com/", "https://www.loom.com/account")).toBe(true);
  });

  it("leaves a link a person wrote alone, and treats a missing link as not guessed", () => {
    expect(isGuessedCancelUrl("https://www.netflix.com", "https://www.netflix.com/cancelplan")).toBe(false);
    expect(isGuessedCancelUrl("https://store.ubisoft.com", "https://store.ubisoft.com/us/ubisoftplus/account")).toBe(false);
    expect(isGuessedCancelUrl("https://www.loom.com", undefined)).toBe(false);
  });
});
