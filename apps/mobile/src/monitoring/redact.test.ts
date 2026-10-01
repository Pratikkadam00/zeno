import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { redactError, redactText, redactValue } from "./redact";

/**
 * P3.2: no credential or email address leaves the app in an error report.
 * Each sample is a real shape from this codebase: the magic-link verify URL
 * (authStore.ts), Gmail's revoke URL (emailScanner.ts), our 43-character
 * base64url refresh/magic tokens (randomBytes(32).toString("base64url") on the
 * API), an RS256 access token, an Authorization header, an email address.
 */
const OUR_TOKEN = randomBytes(32).toString("base64url");
const JWT = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ sub: "acct_1", email: "jane@example.com" })).toString("base64url")}.${randomBytes(64).toString("base64url")}`;
const SHORT_BEARER = "sk-9f2c";
const SECRETS = [OUR_TOKEN, JWT, "jane.doe+zeno@mail.example.co.uk", "4/0AanRRrt-secret-code", SHORT_BEARER];

describe("redactText", () => {
  it.each([
    ["the magic-link verify URL", `GET https://zeno-zw8i.onrender.com/api/v1/auth/verify?token=${OUR_TOKEN} failed`],
    ["Gmail's revoke URL", `POST https://oauth2.googleapis.com/revoke?token=${JWT}&x=1 → 400`],
    ["an echoed Authorization header", `Request failed: Authorization: Bearer ${JWT}`],
    ["a bare JWT", `could not parse ${JWT}`],
    ["a bare refresh token", `refresh ${OUR_TOKEN} was rejected`],
    ["an email address", "No account for jane.doe+zeno@mail.example.co.uk"],
    ["an OAuth code in a query", "callback?code=4/0AanRRrt-secret-code&scope=gmail.readonly"],
    // Too short for the long-token rule: only the Bearer rule catches it.
    ["a SHORT bearer token", `upstream said: Authorization: Bearer ${SHORT_BEARER} is invalid`]
  ])("removes %s", (_name, text) => {
    const out = redactText(text);
    for (const secret of SECRETS) expect(out, out).not.toContain(secret);
    expect(out).toMatch(/\[redacted/);
  });

  it("labels what it removed, so a report still says what was there", () => {
    // Every RS256 JWT also matches the long-token rule (its header alone is 36
    // characters), so the JWT rule adds no safety; it keeps the label specific.
    expect(redactText(`bad ${JWT}`)).toBe("bad [redacted-jwt]");
    expect(redactText("for jane@example.com")).toBe("for [redacted-email]");
    expect(redactText(`Bearer ${SHORT_BEARER}`)).toBe("Bearer [redacted]");
  });

  it("leaves ordinary diagnostics alone: amounts, ids, routes, long component names", () => {
    for (const text of [
      "Failed to persist subscription sub_netflix ($15.49).",
      "at SubscriptionHydrationBoundaryProviderComponent (index.android.bundle:1:23456)",
      "GET /api/v1/sync/pull → 503",
      "Corrupt budget config; using defaults."
    ]) expect(redactText(text)).toBe(text);
  });
});

describe("redactValue / redactError", () => {
  it("walks objects and arrays, and redacts an Error's message AND stack, keeping its name", () => {
    const error = new TypeError(`bad token=${OUR_TOKEN}`);
    error.stack = `TypeError: bad token=${OUR_TOKEN}\n    at verify (authStore.ts:180)\n    for jane@example.com`;
    const out = redactValue({ list: ["jane@example.com", { deep: `Bearer ${JWT}` }], error }) as {
      list: [string, { deep: string }];
      error: Error;
    };
    const flat = JSON.stringify(out) + out.error.message + out.error.stack;
    for (const secret of [...SECRETS, "jane@example.com"]) expect(flat).not.toContain(secret);
    expect(out.error).toBeInstanceOf(Error);
    expect(out.error.name).toBe("TypeError");
    expect(out.error.stack).toContain("at verify (authStore.ts:180)");
  });

  it("an Error with no stack is redacted and stays stackless (nothing invented)", () => {
    const error = new Error("No account for jane@example.com");
    delete (error as { stack?: string }).stack;
    const out = redactError(error);
    expect(out.message).toBe("No account for [redacted-email]");
    expect(out.stack).toBeUndefined();
  });

  it("returns the SAME Error when nothing needed redacting (its stack and identity intact)", () => {
    const error = new Error("Subscription database unavailable");
    expect(redactError(error)).toBe(error);
  });

  it("leaves non-strings alone; past the depth limit a value is DROPPED, never passed through unredacted", () => {
    expect(redactValue(42)).toBe(42);
    expect(redactValue(null)).toBeNull();
    const deep = { a: { b: { c: { d: { e: "jane@example.com" } } } } };
    expect(redactValue(deep)).toEqual({ a: { b: { c: { d: "[truncated]" } } } });
    const cycle: Record<string, unknown> = { name: "loop" };
    cycle.self = cycle;
    expect(() => redactValue(cycle)).not.toThrow();
  });
});
