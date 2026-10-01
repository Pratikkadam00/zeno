import { describe, expect, it } from "vitest";
import { billingSuffix } from "./billing-label";

describe("billingSuffix (F130, F131)", () => {
  it.each([
    ["monthly", "/month"],
    ["annual", "/year"],
    ["weekly", "/week"],
    ["quarterly", "/quarter"],
    ["trial", "/trial"],
    ["unknown", ""]
  ] as const)("%s: %j", (cycle, suffix) => {
    expect(billingSuffix(cycle)).toBe(suffix);
  });
});
