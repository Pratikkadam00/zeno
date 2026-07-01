import { describe, expect, it } from "vitest";
import { isAuthVerifyLink } from "./deep-link";

describe("isAuthVerifyLink", () => {
  it("matches the standalone custom-scheme parse (host=auth, path=verify)", () => {
    // zeno://auth/verify → new URL → hostname "auth", pathname "/verify"
    expect(isAuthVerifyLink("auth", "verify")).toBe(true);
  });

  it("matches the Expo Go dev parse (host=ip, path=auth/verify)", () => {
    expect(isAuthVerifyLink("192.168.1.5", "auth/verify")).toBe(true);
  });

  it("tolerates a leading slash on the path", () => {
    expect(isAuthVerifyLink("auth", "/verify")).toBe(true);
  });

  it("rejects a lookalike host so it can't be spoofed by suffix", () => {
    expect(isAuthVerifyLink("evilauth", "verify")).toBe(false);
  });

  it("rejects unrelated deep links", () => {
    expect(isAuthVerifyLink("dashboard", null)).toBe(false);
    expect(isAuthVerifyLink(null, "settings")).toBe(false);
    expect(isAuthVerifyLink("auth", "reset")).toBe(false);
    expect(isAuthVerifyLink(null, null)).toBe(false);
  });
});
