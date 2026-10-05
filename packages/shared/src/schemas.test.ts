import { describe, expect, it } from "vitest";
import { syncPullSchema, syncPushSchema } from "./schemas";

// The API parses /sync/pull and /sync/push with these two (apps/api/src/app.ts;
// schema-valid.test.ts proves each route uses its own schema). These pin every
// limit at its edge, so a limit loosened or tightened by one fails here (P6.1,
// F205: Stryker found each of them unchecked).

const change = (over: Record<string, unknown> = {}) => ({
  entityType: "subscription",
  entityId: "s1",
  operation: "update",
  encryptedPayload: "cipher",
  vectorClock: { phone: 1 },
  ...over
});
const push = (changes: unknown[]) => syncPushSchema.safeParse({ encryptedChanges: changes });
const clockOf = (entries: number) => Object.fromEntries(Array.from({ length: entries }, (_, i) => [`device${i}`, 1]));

describe("syncPullSchema", () => {
  it("takes a cursor up to 64 characters, not 65", () => {
    expect(syncPullSchema.safeParse({ cursor: "c" }).success).toBe(true);
    expect(syncPullSchema.safeParse({ cursor: "c".repeat(64) }).success).toBe(true);
    expect(syncPullSchema.safeParse({ cursor: "c".repeat(65) }).success).toBe(false);
  });

  it("reads the limit from a query string, 1 to 100, and defaults to 50", () => {
    expect(syncPullSchema.parse({})).toEqual({ limit: 50 });
    expect(syncPullSchema.parse({ limit: "1" }).limit).toBe(1);
    expect(syncPullSchema.parse({ limit: "10" }).limit).toBe(10);
    expect(syncPullSchema.parse({ limit: "100" }).limit).toBe(100);
    expect(syncPullSchema.safeParse({ limit: "0" }).success).toBe(false);
    expect(syncPullSchema.safeParse({ limit: "101" }).success).toBe(false);
    expect(syncPullSchema.safeParse({ limit: "2.5" }).success).toBe(false);
  });
});

describe("syncPushSchema", () => {
  it.each(["subscription", "preference", "profile"])("accepts the entity type %s", (entityType) => {
    expect(push([change({ entityType })]).success).toBe(true);
  });

  it("rejects any other entity type", () => {
    expect(push([change({ entityType: "household" })]).success).toBe(false);
  });

  it.each(["create", "update", "delete"])("accepts the operation %s", (operation) => {
    expect(push([change({ operation })]).success).toBe(true);
  });

  it("rejects any other operation", () => {
    expect(push([change({ operation: "upsert" })]).success).toBe(false);
  });

  it("takes an entity id of 1 to 128 characters", () => {
    expect(push([change({ entityId: "" })]).success).toBe(false);
    expect(push([change({ entityId: "e".repeat(128) })]).success).toBe(true);
    expect(push([change({ entityId: "e".repeat(129) })]).success).toBe(false);
  });

  it("takes an encrypted payload up to 8192 characters", () => {
    expect(push([change({ encryptedPayload: "p".repeat(8192) })]).success).toBe(true);
    expect(push([change({ encryptedPayload: "p".repeat(8193) })]).success).toBe(false);
  });

  it("takes up to 100 changes in one push", () => {
    expect(push(Array.from({ length: 100 }, () => change())).success).toBe(true);
    expect(push(Array.from({ length: 101 }, () => change())).success).toBe(false);
  });

  it("takes a vector clock of up to 64 entries, not 65, and says why", () => {
    expect(push([change({ vectorClock: clockOf(64) })]).success).toBe(true);
    const tooMany = push([change({ vectorClock: clockOf(65) })]);
    expect(tooMany.success).toBe(false);
    expect(tooMany.error?.issues.map((issue) => issue.message)).toContain("vectorClock has too many entries");
  });

  it("bounds each clock entry: a device name up to 64 characters, a count from 0 to 2^40", () => {
    expect(push([change({ vectorClock: { ["d".repeat(64)]: 0 } })]).success).toBe(true);
    expect(push([change({ vectorClock: { ["d".repeat(65)]: 0 } })]).success).toBe(false);
    expect(push([change({ vectorClock: { phone: 2 ** 40 } })]).success).toBe(true);
    expect(push([change({ vectorClock: { phone: 2 ** 40 + 1 } })]).success).toBe(false);
    expect(push([change({ vectorClock: { phone: -1 } })]).success).toBe(false);
    expect(push([change({ vectorClock: { phone: 1.5 } })]).success).toBe(false);
  });
});
