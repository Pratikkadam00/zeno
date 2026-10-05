import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import type { BillingCycle } from "@zeno/shared";
import { todayLabel } from "@zeno/shared";
import { calculateNextRenewal } from "./discovery/discovery-helpers";
import { parseCSV } from "./discovery/csvParser";
import { rollRenewalForward } from "./utils/subscription-ui";

// The Gmail scanner's module pulls in OAuth and storage: stubbed, as in its own tests.
vi.mock("expo-auth-session", () => ({ exchangeCodeAsync: vi.fn() }));
vi.mock("expo-auth-session/providers/google", () => ({ discovery: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "00000000-0000-0000-0000-000000000000" }));
vi.mock("./security/secure-store", () => ({ getGmailAccountToken: vi.fn(), listGmailAddresses: vi.fn(), removeGmailAccount: vi.fn(), saveGmailAccount: vi.fn() }));
const { parseEmailBody } = await import("./discovery/emailScanner");

// P6.4: the app's date math and parsers, for every input fast-check makes up,
// leap days and month ends included (the dates range over 2000-2099).

const DAY = 86_400_000;
const anyInstant = fc.date({ min: new Date("2000-01-01T00:00:00Z"), max: new Date("2099-12-31T23:59:59Z"), noInvalidDate: true });
// Month ends (the 28th to the 31st, leap days included) are where clamping can
// go wrong, and a uniform date lands there only a few times in a hundred runs:
// a third of the dates are drawn from them, so a broken clamp fails every run.
const monthEnd = fc
  .record({ year: fc.integer({ min: 2000, max: 2099 }), month: fc.integer({ min: 0, max: 11 }), back: fc.integer({ min: 0, max: 3 }), minute: fc.integer({ min: 0, max: 1439 }) })
  .map(({ year, month, back, minute }) => new Date(Date.UTC(year, month, new Date(Date.UTC(year, month + 1, 0)).getUTCDate() - back, 0, minute)));
const instant = fc.oneof({ arbitrary: anyInstant, weight: 2 }, { arbitrary: monthEnd, weight: 1 });
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

describe("calculateNextRenewal", () => {
  it("weekly is exactly seven days on", () => {
    fc.assert(fc.property(instant, (d) => {
      expect(calculateNextRenewal(d, "weekly").getTime() - d.getTime()).toBe(7 * DAY);
    }));
  });

  it("monthly, quarterly and annual land 1, 3 or 12 months on, on the same day or the month's last, at the same time", () => {
    fc.assert(fc.property(instant, fc.constantFrom(["monthly", 1], ["quarterly", 3], ["annual", 12]) as fc.Arbitrary<[ "monthly" | "quarterly" | "annual", number]>, (d, [cycle, months]) => {
      const next = calculateNextRenewal(d, cycle);
      const total = d.getUTCMonth() + months;
      const year = d.getUTCFullYear() + Math.floor(total / 12);
      const month = total % 12;
      expect([next.getUTCFullYear(), next.getUTCMonth()]).toEqual([year, month]);
      expect(next.getUTCDate()).toBe(Math.min(d.getUTCDate(), daysIn(year, month)));
      expect(next.getUTCHours() * 60 + next.getUTCMinutes()).toBe(d.getUTCHours() * 60 + d.getUTCMinutes());
      expect(next.getTime()).toBeGreaterThan(d.getTime());
    }));
  });
});

describe("rollRenewalForward", () => {
  const cycle = fc.constantFrom<BillingCycle>("weekly", "monthly", "quarterly", "annual");

  it("is never in the past, and rolling again changes nothing", () => {
    fc.assert(fc.property(instant, instant, cycle, (renewal, now, c) => {
      const rolled = rollRenewalForward(renewal.toISOString(), c, now)!;
      const day = Date.parse(rolled.slice(0, 10) + "T00:00:00.000Z");
      expect(day).toBeGreaterThanOrEqual(todayLabel(now));
      expect(rollRenewalForward(rolled, c, now)).toBe(rolled);
    }));
  });

  it("a renewal still ahead is left exactly as it was", () => {
    fc.assert(fc.property(instant, cycle, fc.integer({ min: 1, max: 400 }), (now, c, ahead) => {
      const renewal = new Date(todayLabel(now) + ahead * DAY + 9 * 3_600_000).toISOString();
      expect(rollRenewalForward(renewal, c, now)).toBe(renewal);
    }));
  });

  it("monthly-type plans stay on their anchor day (or the month's last day)", () => {
    fc.assert(fc.property(instant, instant, fc.constantFrom<BillingCycle>("monthly", "quarterly", "annual"), (renewal, now, c) => {
      const rolled = new Date(rollRenewalForward(renewal.toISOString(), c, now)!);
      expect(rolled.getUTCDate()).toBe(Math.min(renewal.getUTCDate(), daysIn(rolled.getUTCFullYear(), rolled.getUTCMonth())));
    }));
  });
});

describe("the readers never throw, and never invent a charge", () => {
  it("parseCSV, on any text", () => {
    fc.assert(fc.property(fc.string({ maxLength: 300 }), (text) => {
      const result = parseCSV(text, "USD");
      for (const s of result.subscriptions) {
        expect(Number.isFinite(s.amount) && s.amount > 0).toBe(true);
        expect(["weekly", "monthly", "quarterly", "annual"]).toContain(s.billingCycle);
      }
    }), { numRuns: 300 });
  });

  it("parseEmailBody, on any text from any sender", () => {
    fc.assert(fc.property(fc.string({ maxLength: 300 }), fc.domain(), (text, domain) => {
      const parsed = parseEmailBody(text, domain);
      if (parsed) expect(Number.isFinite(parsed.amount) && parsed.amount > 0).toBe(true);
    }), { numRuns: 300 });
  });
});
