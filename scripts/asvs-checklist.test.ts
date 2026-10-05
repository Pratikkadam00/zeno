import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { load, problems, render } from "./asvs-checklist.mjs";

// P7.2: the ASVS checklist is generated from OWASP's file and Zeno's assessment.
// This keeps it honest: every status is one of the four allowed (never
// "believed"), an open or partial item names its owner, a met one names its
// evidence, every cited file exists, and the file on disk is what they produce.
describe("docs/ASVS_CHECKLIST.md", () => {
  const { asvs, assessment } = load();

  it("every assessment is well formed and cites only files that exist", () => {
    expect(problems(asvs, assessment)).toEqual([]);
  });

  it("is up to date with the assessment (run node scripts/asvs-checklist.mjs)", () => {
    expect(readFileSync(new URL("../docs/ASVS_CHECKLIST.md", import.meta.url), "utf8")).toBe(render(asvs, assessment));
  });

  it("covers every Level 1 and 2 requirement of the published file (253)", () => {
    expect(asvs.filter((r: { L: string }) => r.L === "1" || r.L === "2")).toHaveLength(253);
  });

  it("refuses a status outside the four, an owner-less open item, and a missing file", () => {
    const bad = {
      "V1.1.1": { status: "believed", note: "x" },
      "V1.1.2": { status: "open", note: "x" },
      "V1.2.1": { status: "met", note: "x", evidence: ["no/such/file.ts"] }
    };
    expect(problems(asvs, bad)).toEqual([
      'V1.1.1: status "believed" is not one of met, partial, open, na',
      "V1.1.2: open without an owner",
      "V1.2.1: evidence no/such/file.ts does not exist"
    ]);
  });
});
