import { afterEach, describe, expect, it, vi } from "vitest";
import { isPublicAnalyticsEnabled } from "./analytics-flag";

/**
 * The public /analytics demo dashboard renders synthetic KPIs, so it must stay
 * hidden from real visitors unless someone explicitly opts in with
 * SHOW_PUBLIC_ANALYTICS=1. Only the dev server shows it by default. The flag
 * is read at call time, so each case just stubs the env.
 */
function flagUnder(nodeEnv: string, show?: string): boolean {
  vi.stubEnv("NODE_ENV", nodeEnv);
  if (show === undefined) vi.stubEnv("SHOW_PUBLIC_ANALYTICS", undefined);
  else vi.stubEnv("SHOW_PUBLIC_ANALYTICS", show);
  return isPublicAnalyticsEnabled();
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isPublicAnalyticsEnabled", () => {
  it("is OFF in production by default", () => {
    expect(flagUnder("production")).toBe(false);
  });

  it("is ON in production only with the explicit opt-in SHOW_PUBLIC_ANALYTICS=1", () => {
    expect(flagUnder("production", "1")).toBe(true);
  });

  it.each(["", "0", "true", "yes", "on", " 1", "1 ", "01"])(
    "SHOW_PUBLIC_ANALYTICS=%j is not an opt-in",
    (value) => {
      expect(flagUnder("production", value)).toBe(false);
    }
  );

  it("is ON on the dev server", () => {
    expect(flagUnder("development")).toBe(true);
  });

  // `next build` / `next start` keep a pre-set NODE_ENV ("test" silently,
  // anything else with a warning), and such a server serves real visitors.
  it.each(["test", "staging", "preview"])("is OFF by default under NODE_ENV=%j (kept by next start)", (nodeEnv) => {
    expect(flagUnder(nodeEnv)).toBe(false);
  });

  it.each(["test", "staging"])("the opt-in still works under NODE_ENV=%j", (nodeEnv) => {
    expect(flagUnder(nodeEnv, "1")).toBe(true);
  });
});
