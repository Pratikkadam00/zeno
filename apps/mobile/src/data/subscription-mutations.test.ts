import type { Subscription } from "@zeno/shared";
import { describe, expect, it } from "vitest";
import {
  applySubscriptionChange,
  withNotificationSettingsEntry,
  withUpdatedNotificationSettings,
  withoutNotificationSettingsEntry
} from "./subscription-mutations";
import type { SubscriptionNotificationSettings } from "./subscription-store";

function makeSubscription(id: string, overrides: Partial<Subscription> = {}): Subscription {
  return {
    id,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    name: `Service ${id}`,
    category: "entertainment",
    price: { amountMinor: 1549, currency: "USD" },
    billingCycle: "monthly",
    status: "active",
    ownerProfileId: "profile_local",
    source: "manual",
    ...overrides
  };
}

const allOn: SubscriptionNotificationSettings = { sevenDay: true, threeDay: true, dayOf: true };
const allOff: SubscriptionNotificationSettings = { sevenDay: false, threeDay: false, dayOf: false };

describe("applySubscriptionChange", () => {
  it("returns the mutated subscription so the caller can persist exactly what was rendered", () => {
    // Regression: the store previously captured `updated` inside the setState
    // updater; React skips eager updater evaluation after the first dispatch
    // in an event, so price edits were rendered but never persisted.
    const list = [makeSubscription("a"), makeSubscription("b")];
    const { next, updated } = applySubscriptionChange(list, "b", (s) => ({
      ...s,
      price: { ...s.price, amountMinor: 1999 },
      version: s.version + 1
    }));

    expect(updated).not.toBeNull();
    expect(updated!.price.amountMinor).toBe(1999);
    expect(updated!.version).toBe(2);
    expect(next.find((s) => s.id === "b")).toBe(updated);
    expect(next.find((s) => s.id === "a")).toBe(list[0]);
  });

  it("returns null and the original list for an unknown id", () => {
    const list = [makeSubscription("a")];
    const { next, updated } = applySubscriptionChange(list, "missing", (s) => s);
    expect(updated).toBeNull();
    expect(next).toBe(list);
  });

  it("composes across a loop the way runCancellationVerification uses it", () => {
    let list = [makeSubscription("a", { status: "pending" }), makeSubscription("b", { status: "pending" })];
    const persisted: string[] = [];
    for (const sub of [...list]) {
      const { next, updated } = applySubscriptionChange(list, sub.id, (s) => ({ ...s, status: "cancelled" }));
      list = next;
      if (updated) persisted.push(updated.id);
    }
    // Regression: with capture-in-updater, every iteration after the first
    // silently skipped persistence.
    expect(persisted).toEqual(["a", "b"]);
    expect(list.every((s) => s.status === "cancelled")).toBe(true);
  });
});

describe("notification settings helpers", () => {
  it("withoutNotificationSettingsEntry removes only the deleted id", () => {
    // Regression: deleting a subscription persisted `{}` (the pre-updater
    // capture), wiping every subscription's reminder settings in SQLite.
    const settings = { a: allOn, b: allOff, c: allOn };
    const next = withoutNotificationSettingsEntry(settings, "b");
    expect(next).toEqual({ a: allOn, c: allOn });
    expect(settings).toEqual({ a: allOn, b: allOff, c: allOn }); // input untouched
  });

  it("withNotificationSettingsEntry adds without dropping existing entries", () => {
    const settings = { a: allOff };
    const next = withNotificationSettingsEntry(settings, "b", allOn);
    expect(next).toEqual({ a: allOff, b: allOn });
  });

  it("withUpdatedNotificationSettings merges changes over existing values", () => {
    const settings = { a: allOn };
    const next = withUpdatedNotificationSettings(settings, "a", { dayOf: false }, allOn);
    expect(next.a).toEqual({ sevenDay: true, threeDay: true, dayOf: false });
  });

  it("withUpdatedNotificationSettings falls back to defaults for an id with no entry", () => {
    const next = withUpdatedNotificationSettings({}, "new", { sevenDay: false }, allOn);
    expect(next.new).toEqual({ sevenDay: false, threeDay: true, dayOf: true });
  });
});
