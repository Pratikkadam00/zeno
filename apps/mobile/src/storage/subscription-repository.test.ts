import type { Subscription } from "@zeno/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openRealSqlite } from "./sqlite-adapter.testutil";

// subscription-repository.ts on a REAL SQLite engine with the real v1 schema.
vi.mock("expo-sqlite", () => ({ openDatabaseAsync: vi.fn() }));
vi.mock("../security/secure-store", () => ({ getOrCreateDatabaseKey: vi.fn() }));

const { runMigrations } = await import("./database");
const repo = await import("./subscription-repository");

type Db = Parameters<typeof runMigrations>[0];
let d: ReturnType<typeof openRealSqlite>;
const db = () => d as unknown as Db;

beforeEach(async () => {
  d = openRealSqlite();
  await runMigrations(db());
});

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  id: "s1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  version: 1,
  name: "Netflix",
  category: "entertainment",
  price: { amountMinor: 1549, currency: "USD" },
  billingCycle: "monthly",
  status: "active",
  ownerProfileId: "me",
  source: "manual",
  ...over
});

describe("subscription repository (real SQLite)", () => {
  it("round-trips a minimal subscription exactly (absent optionals come back undefined, not null)", async () => {
    const s = sub();
    await repo.upsertSubscription(db(), s);
    expect(await repo.listSubscriptions(db())).toEqual([s]);
  });

  it("round-trips every optional field", async () => {
    const s = sub({
      serviceSlug: "netflix",
      nextRenewalDate: "2026-02-01",
      lastChargedDate: "2026-01-01",
      valueRating: "high",
      notes: "family plan",
      mutedUntil: "2026-03-01",
      cancellationRequestedAt: "2026-01-15T00:00:00.000Z",
      cancellationVerifyBy: "2026-02-15",
      deviceId: "device-1"
    });
    await repo.upsertSubscription(db(), s);
    expect(await repo.listSubscriptions(db())).toEqual([s]);
  });

  it("an upsert updates the row but NEVER rewrites created_at or device_id", async () => {
    await repo.upsertSubscription(db(), sub({ deviceId: "device-1" }));
    await repo.upsertSubscription(db(), sub({ name: "Netflix Premium", price: { amountMinor: 2299, currency: "USD" }, createdAt: "2030-01-01T00:00:00.000Z", deviceId: "device-2", updatedAt: "2026-02-01T00:00:00.000Z", version: 2 }));
    const [row] = await repo.listSubscriptions(db());
    expect(row).toMatchObject({ name: "Netflix Premium", price: { amountMinor: 2299 }, createdAt: "2026-01-01T00:00:00.000Z", deviceId: "device-1", version: 2 });
  });

  it("lists by next renewal date, then name; rows without a date sort FIRST (SQLite ASC puts NULL first)", async () => {
    await repo.upsertSubscription(db(), sub({ id: "late", name: "B", nextRenewalDate: "2026-05-01" }));
    await repo.upsertSubscription(db(), sub({ id: "early-b", name: "B", nextRenewalDate: "2026-02-01" }));
    await repo.upsertSubscription(db(), sub({ id: "early-a", name: "A", nextRenewalDate: "2026-02-01" }));
    await repo.upsertSubscription(db(), sub({ id: "undated", name: "Z" }));
    expect((await repo.listSubscriptions(db())).map((s) => s.id)).toEqual(["undated", "early-a", "early-b", "late"]);
  });

  it("soft delete hides the row, stamps deleted_at/updated_at and bumps the version", async () => {
    vi.useFakeTimers({ now: new Date("2026-09-30T12:00:00.000Z"), toFake: ["Date"] });
    try {
      await repo.upsertSubscription(db(), sub());
      await repo.softDeleteSubscription(db(), "s1");
      expect(await repo.listSubscriptions(db())).toEqual([]);
      expect(await d.getFirstAsync("SELECT deleted_at, updated_at, version FROM subscriptions WHERE id = 's1'")).toEqual({
        deleted_at: "2026-09-30T12:00:00.000Z",
        updated_at: "2026-09-30T12:00:00.000Z",
        version: 2
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("'Delete all data' hard-deletes every row, soft-deleted ones included", async () => {
    await repo.upsertSubscription(db(), sub({ id: "a" }));
    await repo.upsertSubscription(db(), sub({ id: "b" }));
    await repo.softDeleteSubscription(db(), "b");
    await repo.clearAllSubscriptions(db());
    expect(await d.getFirstAsync("SELECT COUNT(*) AS n FROM subscriptions")).toEqual({ n: 0 });
  });

  it("every value is a bound parameter: hostile text is stored as data", async () => {
    const hostile = "x'); DROP TABLE subscriptions; --";
    await repo.upsertSubscription(db(), sub({ name: hostile, notes: hostile }));
    const [row] = await repo.listSubscriptions(db());
    expect(row).toMatchObject({ name: hostile, notes: hostile });
  });
});
