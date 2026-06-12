import { describe, expect, it } from "vitest";
import { createSpendTwin, summarizeSpendTwin } from "./twin";

describe("spend twin", () => {
  it("creates lifestyle comparisons from monthly spend", () => {
    const twin = createSpendTwin(28400);
    expect(twin[0]?.quantity).toBe(28);
    expect(summarizeSpendTwin(28400)).toContain("$284.00");
  });
});
