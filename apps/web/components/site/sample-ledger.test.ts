import { describe, expect, it } from "vitest";
import { CANCEL_FLOWS, FLOW_GLYPH, SAMPLE_BASE, SAMPLE_SUBS } from "./sample-ledger";

describe("the hero's sample ledger", () => {
  it("the base total is the sum of the five sample rows, to the cent", () => {
    expect(SAMPLE_SUBS).toHaveLength(5);
    expect(Math.round(SAMPLE_BASE * 100)).toBe(SAMPLE_SUBS.reduce((cents, s) => cents + Math.round(s.amt * 100), 0));
  });

  it("every sample row has a cancel flow that opens the service first and ends submitted", () => {
    for (const sub of SAMPLE_SUBS) {
      const flow = CANCEL_FLOWS[sub.n];
      expect(flow, sub.n).toBeDefined();
      expect(flow![0]!.c).toBe("run");
      expect(flow!.at(-1)!.c).toBe("ok");
    }
    expect(Object.keys(CANCEL_FLOWS).sort()).toEqual(SAMPLE_SUBS.map((s) => s.n).sort());
  });

  it("each kind of flow line has a glyph", () => {
    const kinds = new Set(Object.values(CANCEL_FLOWS).flat().map((l) => l.c));
    for (const kind of kinds) expect(FLOW_GLYPH[kind]).toBeTruthy();
  });
});
