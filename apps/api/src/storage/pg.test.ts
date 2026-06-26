import { afterEach, describe, expect, it } from "vitest";
import { encryptionConfigured, initStorage, kvDelete, kvPersist, openValue, pgEnabled, registerHydrator, sealValue } from "./pg";

// A throwaway 32-byte key (64 hex chars) for the encryption round-trip tests.
const TEST_KEY = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";

// These tests assert the contract that keeps local dev and CI working with no
// database: when DATABASE_URL is unset, every persistence entry point is an
// inert no-op (no connection, no throw). The DB-backed path itself is exercised
// against a real Postgres in deployment, not here.

const original = process.env.DATABASE_URL;
const originalKey = process.env.STORAGE_ENCRYPTION_KEY;

afterEach(() => {
  if (original === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = original;
  if (originalKey === undefined) delete process.env.STORAGE_ENCRYPTION_KEY;
  else process.env.STORAGE_ENCRYPTION_KEY = originalKey;
});

describe("pg storage (no DATABASE_URL)", () => {
  it("reports disabled and reflects the env var", () => {
    delete process.env.DATABASE_URL;
    expect(pgEnabled()).toBe(false);
    process.env.DATABASE_URL = "postgres://example/db";
    expect(pgEnabled()).toBe(true);
  });

  it("kvPersist / kvDelete are silent no-ops without a database", () => {
    delete process.env.DATABASE_URL;
    expect(() => kvPersist("sync", "user|subscription:1", { hello: "world" })).not.toThrow();
    expect(() => kvDelete("sync", "user|subscription:1")).not.toThrow();
  });

  it("initStorage resolves and never invokes hydrators without a database", async () => {
    delete process.env.DATABASE_URL;
    let called = false;
    registerHydrator("__test_unused__", () => {
      called = true;
    });
    await expect(initStorage()).resolves.toBeUndefined();
    expect(called).toBe(false);
  });
});

describe("encryption at rest", () => {
  it("is disabled without a valid key and enabled with one", () => {
    delete process.env.STORAGE_ENCRYPTION_KEY;
    expect(encryptionConfigured()).toBe(false);
    process.env.STORAGE_ENCRYPTION_KEY = "too-short";
    expect(encryptionConfigured()).toBe(false);
    process.env.STORAGE_ENCRYPTION_KEY = TEST_KEY;
    expect(encryptionConfigured()).toBe(true);
  });

  it("seals and opens a value round-trip", () => {
    process.env.STORAGE_ENCRYPTION_KEY = TEST_KEY;
    const secret = { accessToken: "access-sandbox-abc123", itemId: "item_9" };
    const sealed = sealValue(secret);
    expect(typeof sealed.enc).toBe("string");
    expect(sealed.enc).not.toContain("access-sandbox"); // ciphertext, not plaintext
    expect(openValue(sealed)).toEqual(secret);
  });

  it("returns null when the envelope is tampered with", () => {
    process.env.STORAGE_ENCRYPTION_KEY = TEST_KEY;
    const sealed = sealValue({ accessToken: "secret" });
    const tampered = { enc: sealed.enc.slice(0, -4) + (sealed.enc.endsWith("A") ? "BBBB" : "AAAA") };
    expect(openValue(tampered)).toBeNull();
  });

  it("returns null when the key is absent", () => {
    process.env.STORAGE_ENCRYPTION_KEY = TEST_KEY;
    const sealed = sealValue({ accessToken: "secret" });
    delete process.env.STORAGE_ENCRYPTION_KEY;
    expect(openValue(sealed)).toBeNull();
  });
});
