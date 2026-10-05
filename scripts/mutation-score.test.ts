import { describe, expect, it } from "vitest";
import { markdown, scoreOf } from "./mutation-score.mjs";

const m = (...statuses: string[]) => statuses.map((status) => ({ status }));

describe("mutation-score", () => {
  it("counts killed and timed-out as caught, leaves ignored and errors out, keeps no-coverage in", () => {
    expect(scoreOf(m("Killed", "Timeout", "Survived", "NoCoverage", "Ignored", "CompileError", "RuntimeError"))).toEqual({
      detected: 2, valid: 4, survived: 1, noCoverage: 1, score: 50
    });
  });

  it("an empty report scores 100 (nothing to catch)", () => {
    expect(scoreOf([]).score).toBe(100);
  });

  it("prints one row per file, lowest first, and the total", () => {
    const text = markdown({ files: { "a.ts": { mutants: m("Killed", "Killed") }, "b.ts": { mutants: m("Killed", "Survived") } } }, "T");
    expect(text.split("\n")).toEqual([
      "### T",
      "",
      "| File | Score | Caught | Survived | No test reached |",
      "|---|---|---|---|---|",
      "| `b.ts` | 50.00 % | 1 / 2 | 1 | 0 |",
      "| `a.ts` | 100.00 % | 2 / 2 | 0 | 0 |",
      "| **All** | 75.00 % | 3 / 4 | 1 | 0 |",
      ""
    ]);
  });
});
