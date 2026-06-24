import { afterEach, describe, expect, it } from "vitest";
import { initStorage, kvDelete, kvPersist, pgEnabled, registerHydrator } from "./pg";

// These tests assert the contract that keeps local dev and CI working with no
// database: when DATABASE_URL is unset, every persistence entry point is an
// inert no-op (no connection, no throw). The DB-backed path itself is exercised
// against a real Postgres in deployment, not here.

const original = process.env.DATABASE_URL;

afterEach(() => {
  if (original === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = original;
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
