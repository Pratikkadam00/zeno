import { describe, expect, it } from "vitest";
import { evaluate } from "./audit-gate.mjs";

type Via = { url: string; severity: string; title: string } | string;
type Tree = { vulnerabilities: Record<string, { severity: string; via: Via[] }> };

const adv = (pkg: string, id: string, severity = "high"): Tree => ({
  vulnerabilities: {
    [pkg]: { severity, via: [{ url: `https://github.com/advisories/${id}`, severity, title: `${pkg} bad` }] }
  }
});
const allow = (id: string, expires: string) => ({ accepted: [{ advisory: id, package: "x", reason: "r", expires }] });
const NONE = { accepted: [] as { advisory: string; package: string; reason: string; expires: string }[] };
const TODAY = new Date("2026-09-29");

describe("audit-gate.evaluate", () => {
  it("passes a clean tree", () => {
    expect(evaluate({ vulnerabilities: {} }, NONE, TODAY).ok).toBe(true);
  });

  it("BLOCKS an unlisted high advisory", () => {
    const r = evaluate(adv("a", "GHSA-1"), NONE, TODAY);
    expect(r.ok).toBe(false);
    expect(r.findings[0]).toMatchObject({ kind: "unlisted", id: "GHSA-1" });
  });

  it("BLOCKS an unlisted critical advisory", () => {
    expect(evaluate(adv("a", "GHSA-2", "critical"), NONE, TODAY).ok).toBe(false);
  });

  it("ignores moderate and low (not the release gate's job)", () => {
    expect(evaluate(adv("a", "GHSA-3", "moderate"), NONE, TODAY).ok).toBe(true);
    expect(evaluate(adv("a", "GHSA-3b", "low"), NONE, TODAY).ok).toBe(true);
  });

  it("passes an accepted advisory that has not expired", () => {
    expect(evaluate(adv("a", "GHSA-4"), allow("GHSA-4", "2026-12-31"), TODAY).ok).toBe(true);
  });

  it("BLOCKS an accepted advisory once its expiry has passed", () => {
    const r = evaluate(adv("a", "GHSA-5"), allow("GHSA-5", "2026-09-28"), TODAY);
    expect(r.ok).toBe(false);
    expect(r.findings[0]).toMatchObject({ kind: "expired", id: "GHSA-5" });
  });

  it("an allowlist entry never masks a DIFFERENT advisory on the same package", () => {
    const tree: Tree = {
      vulnerabilities: {
        a: {
          severity: "high",
          via: [
            { url: "https://github.com/advisories/GHSA-6", severity: "high", title: "known" },
            { url: "https://github.com/advisories/GHSA-7", severity: "high", title: "new" }
          ]
        }
      }
    };
    const r = evaluate(tree, allow("GHSA-6", "2026-12-31"), TODAY);
    expect(r.ok).toBe(false);
    expect(r.findings.map((f: { id: string }) => f.id)).toEqual(["GHSA-7"]);
  });

  it("a MODERATE advisory riding inside a high-severity package is NOT a finding", () => {
    // npm sets the package's severity to the max of its advisories; the
    // moderate one must not be reported as blocking just because a sibling is.
    const tree: Tree = {
      vulnerabilities: {
        a: {
          severity: "high",
          via: [
            { url: "https://github.com/advisories/GHSA-8", severity: "moderate", title: "quadratic" },
            { url: "https://github.com/advisories/GHSA-9", severity: "high", title: "recursion" }
          ]
        }
      }
    };
    const r = evaluate(tree, NONE, TODAY);
    expect(r.findings.map((f: { id: string }) => f.id)).toEqual(["GHSA-9"]);
  });

  it("reports an advisory ONCE even when npm lists it once per vulnerable path", () => {
    const via = { url: "https://github.com/advisories/GHSA-10", severity: "high", title: "dup" };
    const tree: Tree = { vulnerabilities: { a: { severity: "high", via: [via, via, { ...via }] } } };
    const r = evaluate(tree, NONE, TODAY);
    expect(r.findings).toHaveLength(1);
  });

  it("skips string 'via' entries (transitive pointers carry no advisory)", () => {
    const tree: Tree = { vulnerabilities: { a: { severity: "high", via: ["b"] } } };
    expect(evaluate(tree, NONE, TODAY).ok).toBe(true);
  });
});
