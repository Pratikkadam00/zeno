import { describe, expect, it } from "vitest";
import { canUseScope, createPublicApiKeyPreview, type PublicApiKey } from "./keys";

const NOW = new Date("2026-09-30T12:00:00.000Z");

const key: PublicApiKey = {
  id: "key_test",
  label: "Test key",
  prefix: "sr_test",
  scopes: ["subscriptions:read"],
  createdAt: "2026-09-01T00:00:00.000Z"
};

describe("createPublicApiKeyPreview", () => {
  it("copies only allowlisted fields, so secret material on the input object never reaches the preview", () => {
    // A caller might hand over a DB row that also carries the secret or its
    // hash. The preview is built field by field, so neither can leak.
    const row = { ...key, secret: "sr_test_aaaaaaaaaaaaaaaaaaaaaaaa", secretHash: "hash_aaaaaaaa" } as PublicApiKey;
    const preview = createPublicApiKeyPreview(row);
    const serialized = JSON.stringify(preview);
    expect(serialized).not.toContain("aaaaaaaaaaaaaaaaaaaaaaaa");
    expect(serialized).not.toContain("hash_aaaaaaaa");
    expect(Object.keys(preview).sort()).toEqual(["createdAt", "id", "label", "maskedKey", "scopes"]);
  });

  it("shows only the public prefix followed by a fixed-length mask", () => {
    expect(createPublicApiKeyPreview(key).maskedKey).toBe(`sr_test_${"*".repeat(24)}`);
  });

  it("carries expiry and revocation dates when the key has them", () => {
    const preview = createPublicApiKeyPreview({ ...key, expiresAt: "2027-01-01T00:00:00.000Z", revokedAt: "2026-09-15T00:00:00.000Z" });
    expect(preview.expiresAt).toBe("2027-01-01T00:00:00.000Z");
    expect(preview.revokedAt).toBe("2026-09-15T00:00:00.000Z");
  });

  it("omits expiry and revocation keys entirely when absent (no undefined-valued fields)", () => {
    const preview = createPublicApiKeyPreview(key);
    expect("expiresAt" in preview).toBe(false);
    expect("revokedAt" in preview).toBe(false);
  });
});

describe("canUseScope", () => {
  it("allows a granted scope on a live key", () => {
    expect(canUseScope(key, "subscriptions:read", NOW)).toBe(true);
    expect(canUseScope({ ...key, expiresAt: "2026-10-01T00:00:00.000Z" }, "subscriptions:read", NOW)).toBe(true);
  });

  it("refuses a scope the key was not granted", () => {
    expect(canUseScope(key, "subscriptions:write", NOW)).toBe(false);
  });

  it("refuses every scope on a revoked key", () => {
    expect(canUseScope({ ...key, revokedAt: "2026-09-15T00:00:00.000Z" }, "subscriptions:read", NOW)).toBe(false);
  });

  it("refuses a key that expired, including at the exact expiry instant", () => {
    expect(canUseScope({ ...key, expiresAt: "2026-09-29T00:00:00.000Z" }, "subscriptions:read", NOW)).toBe(false);
    expect(canUseScope({ ...key, expiresAt: NOW.toISOString() }, "subscriptions:read", NOW)).toBe(false);
  });

  it("fails CLOSED on an expiry it cannot parse", () => {
    // Date.parse("never") is NaN, and `NaN <= now` is false, so the old check
    // read an unparseable expiry as "not expired": the key worked forever.
    expect(canUseScope({ ...key, expiresAt: "never" }, "subscriptions:read", NOW)).toBe(false);
  });
});
