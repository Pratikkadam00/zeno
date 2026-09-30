import { describe, expect, it } from "vitest";
import type { Subscription } from "../domain";
import { createRenewalReminderPlan, formatMoneyMinor, type ReminderPreferenceLookup } from "./renewal-plan";

function sub(input: Partial<Subscription> & Pick<Subscription, "id">): Subscription {
  return {
    name: input.id,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    category: "productivity",
    price: { amountMinor: 5499, currency: "USD" },
    billingCycle: "monthly",
    status: "active",
    ownerProfileId: "p",
    source: "manual",
    ...input
  };
}

const utc = (y: number, m: number, d: number, h = 0, min = 0) => new Date(Date.UTC(y, m - 1, d, h, min)).toISOString();

describe("createRenewalReminderPlan — which subscriptions get reminders", () => {
  it("skips inactive subscriptions, undated ones and dates it cannot parse", () => {
    const plans = createRenewalReminderPlan([
      sub({ id: "cancelled", status: "cancelled", nextRenewalDate: utc(2026, 7, 1) }),
      sub({ id: "undated" }),
      sub({ id: "bad", nextRenewalDate: "not a date" })
    ], new Date(utc(2026, 6, 1)));
    expect(plans).toEqual([]);
  });

  it("drops reminders whose time has already passed", () => {
    // Renewal on the 10th, now the 5th: the 7-day reminder (the 3rd) is past.
    const plans = createRenewalReminderPlan([sub({ id: "a", nextRenewalDate: utc(2026, 6, 10, 9) })], new Date(utc(2026, 6, 5)));
    expect(plans.map((p) => p.kind)).toEqual(["three_day", "day_of"]);
  });

  it("sorts every subscription's reminders together by trigger time", () => {
    const plans = createRenewalReminderPlan([
      sub({ id: "late", nextRenewalDate: utc(2026, 6, 20, 9) }),
      sub({ id: "early", nextRenewalDate: utc(2026, 6, 12, 9) })
    ], new Date(utc(2026, 6, 1)));
    expect(plans.map((p) => `${p.subscriptionId}:${p.kind}`)).toEqual([
      // 5th, 9th, 12th (early's day-of), 13th, 17th, 20th.
      "early:seven_day", "early:three_day", "early:day_of", "late:seven_day", "late:three_day", "late:day_of"
    ]);
  });
});

describe("createRenewalReminderPlan — UTC day arithmetic", () => {
  it("steps back across 29 February in a leap year and 28 February otherwise", () => {
    const leap = createRenewalReminderPlan([sub({ id: "a", nextRenewalDate: utc(2028, 3, 2, 9) })], new Date(utc(2028, 1, 1)));
    expect(leap.map((p) => p.triggerAt)).toEqual([utc(2028, 2, 24, 9), utc(2028, 2, 28, 9), utc(2028, 3, 2, 9)]);
    const common = createRenewalReminderPlan([sub({ id: "a", nextRenewalDate: utc(2027, 3, 2, 9) })], new Date(utc(2027, 1, 1)));
    expect(common.map((p) => p.triggerAt)).toEqual([utc(2027, 2, 23, 9), utc(2027, 2, 27, 9), utc(2027, 3, 2, 9)]);
  });
});

describe("createRenewalReminderPlan — copy and actions", () => {
  it("writes each rung's title, body and action with the amount in the subscription's currency", () => {
    const plans = createRenewalReminderPlan(
      [sub({ id: "h", name: "Hotstar", price: { amountMinor: 49900, currency: "INR" }, nextRenewalDate: utc(2026, 6, 20, 12) })],
      new Date(utc(2026, 6, 1))
    );
    expect(plans.map(({ kind, title, body, action, serviceName }) => ({ kind, title, body, action, serviceName }))).toEqual([
      { kind: "seven_day", title: "Hotstar renews in 7 days", body: "₹499.00 is scheduled. Review it before the renewal window.", action: "view", serviceName: "Hotstar" },
      { kind: "three_day", title: "Hotstar renews in 3 days", body: "₹499.00 will be charged soon. Cancellation guide is ready.", action: "cancel_now", serviceName: "Hotstar" },
      { kind: "day_of", title: "Hotstar renews today", body: "₹499.00 is due today. Was this expected?", action: "confirm_charge", serviceName: "Hotstar" }
    ]);
  });
});

describe("createRenewalReminderPlan — quiet hours", () => {
  const now = new Date(utc(2026, 6, 1, 8));
  const triggerOf = (renewal: string, preferences: ReminderPreferenceLookup, kind: "seven_day" | "day_of") =>
    createRenewalReminderPlan([sub({ id: "a", nextRenewalDate: renewal })], now, preferences).find((p) => p.kind === kind)?.triggerAt;

  it("moves a reminder inside a same-day window (09:00-17:00) to the window end", () => {
    const window = { seven_day: { enabled: true, quietHoursStart: "09:00", quietHoursEnd: "17:00" } };
    expect(triggerOf(utc(2026, 6, 27, 10), window, "seven_day")).toBe(utc(2026, 6, 20, 17));
  });

  it("leaves a reminder just outside a same-day window alone (before start; at the end hour)", () => {
    const window = { seven_day: { enabled: true, quietHoursStart: "09:00", quietHoursEnd: "17:00" } };
    expect(triggerOf(utc(2026, 6, 27, 8, 59), window, "seven_day")).toBe(utc(2026, 6, 20, 8, 59));
    expect(triggerOf(utc(2026, 6, 27, 17), window, "seven_day")).toBe(utc(2026, 6, 20, 17));
  });

  it("clamps a day-of reminder to the renewal instant when the window end is later", () => {
    const window = { day_of: { enabled: true, quietHoursStart: "09:00", quietHoursEnd: "17:00" } };
    expect(triggerOf(utc(2026, 6, 20, 10), window, "day_of")).toBe(utc(2026, 6, 20, 10));
  });

  it("drops a day-of reminder that the clamp moves into the past", () => {
    // 23:00 renewal, 22:00-06:00 window: the bounded shift is to 06:00 the
    // same day, which is already behind a 22:30 'now'.
    const plans = createRenewalReminderPlan(
      [sub({ id: "a", nextRenewalDate: utc(2026, 6, 20, 23) })],
      new Date(utc(2026, 6, 20, 22, 30)),
      { day_of: { enabled: true, quietHoursStart: "22:00", quietHoursEnd: "06:00" } }
    );
    expect(plans).toEqual([]);
  });

  it("ignores quiet hours that are incomplete or unreadable", () => {
    const renewal = utc(2026, 6, 27, 23);
    const unchanged = utc(2026, 6, 20, 23);
    for (const preference of [
      { enabled: true },
      { enabled: true, quietHoursStart: "22:00" },
      { enabled: true, quietHoursStart: "late", quietHoursEnd: "06:00" },
      { enabled: true, quietHoursStart: "22:00", quietHoursEnd: "24:00" },
      { enabled: true, quietHoursStart: "-1:00", quietHoursEnd: "06:00" }
    ]) {
      expect(triggerOf(renewal, { seven_day: preference }, "seven_day")).toBe(unchanged);
    }
  });

  it("reads the hour from 'H', 'HH:MM' and ' H:MM' forms (minutes are not used)", () => {
    const renewal = utc(2026, 6, 27, 23);
    expect(triggerOf(renewal, { seven_day: { enabled: true, quietHoursStart: "22", quietHoursEnd: "6" } }, "seven_day")).toBe(utc(2026, 6, 21, 6));
    expect(triggerOf(renewal, { seven_day: { enabled: true, quietHoursStart: " 22:15", quietHoursEnd: "06:45" } }, "seven_day")).toBe(utc(2026, 6, 21, 6));
  });
});

describe("formatMoneyMinor", () => {
  it("formats minor units in USD by default, or in the given currency", () => {
    expect(formatMoneyMinor(123456)).toBe("$1,234.56");
    expect(formatMoneyMinor(999, "EUR")).toBe("€9.99");
    expect(formatMoneyMinor(-500, "GBP")).toBe("-£5.00");
  });
});
