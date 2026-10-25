import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * F247: what the AI coach may spend. ./storage/pg is a fake table, so these
 * tests also see what the ledger persists and what a restart loads back.
 */
type Entry = { key: string; value: unknown };
const kv = vi.hoisted(() => ({
  rows: new Map<string, unknown>(),
  deleted: [] as string[],
  hydrators: new Map<string, (entries: Entry[]) => void>()
}));

vi.mock("./storage/pg", () => ({
  registerHydrator: (namespace: string, hydrate: (entries: Entry[]) => void) => {
    kv.hydrators.set(namespace, hydrate);
  },
  kvPersistAwait: async (namespace: string, key: string, value: unknown) => {
    if (namespace === "coach-spend") kv.rows.set(key, JSON.parse(JSON.stringify(value)));
    return true;
  },
  kvDelete: (namespace: string, key: string) => {
    if (namespace === "coach-spend") kv.deleted.push(key);
  }
}));

const { MODEL_PRICES, clearCoachLedger, coachLimits, coachSpend, costOf, isCurrentKey, reserveCoachCall, worstCaseCost } = await import("./coach-budget");

const ENV = ["COACH_MONTHLY_BUDGET_USD", "COACH_DAILY_BUDGET_USD", "COACH_ACCOUNT_MONTHLY_BUDGET_USD", "COACH_ACCOUNT_DAILY_REQUESTS"] as const;
const saved = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));

afterEach(() => {
  clearCoachLedger();
  kv.rows.clear();
  kv.deleted = [];
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const SONNET = "claude-sonnet-5-5";
const NOW = new Date("2026-10-25T12:00:00Z");
const reserve = (account = "acct_a", now = NOW, chars = 6_000, maxTokens = 2048) => reserveCoachCall(account, SONNET, chars, maxTokens, now);
const reservation = (r: ReturnType<typeof reserve>) => {
  if (typeof r === "string") throw new Error(`refused: ${r}`);
  return r;
};

describe("prices and costs", () => {
  it("only the three 5.5 models have a price, Sonnet at $2 in and $10 out per million tokens", () => {
    expect(Object.keys(MODEL_PRICES).sort()).toEqual(["claude-haiku-5-5", "claude-opus-5-5", "claude-sonnet-5-5"]);
    expect(MODEL_PRICES[SONNET]).toEqual({ input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 });
  });

  it("a call's cost is every token class at its own rate, in micro-dollars, rounded up", () => {
    // 2,500 in at $2/M = $0.005; 600 out at $10/M = $0.006; total $0.011.
    expect(costOf(SONNET, { input_tokens: 2500, output_tokens: 600 })).toBe(11_000);
    expect(costOf(SONNET, { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 1000, cache_read_input_tokens: 1000 })).toBe(2_700);
    expect(costOf("claude-haiku-5-5", { input_tokens: 1, output_tokens: 0 })).toBe(1); // 0.1 rounds up to 1
    expect(costOf("claude-unknown", { input_tokens: 1, output_tokens: 1 })).toBeNull();
  });

  it("the worst case estimates input high (a token per three characters) and assumes every output token is used", () => {
    // 6,000 chars → 2,000 + 64 tokens in; 2,048 out: $0.004128 + $0.02048.
    expect(worstCaseCost(SONNET, 6_000, 2048)).toBe(24_608);
    expect(worstCaseCost("claude-unknown", 6_000, 2048)).toBeNull();
  });
});

describe("the caps", () => {
  it("defaults: $90 a month (under the account's $100), $6 a day, $0.50 and 10 answers per account per day", () => {
    expect(coachLimits()).toEqual({ monthlyMicro: 90_000_000, dailyMicro: 6_000_000, accountMonthlyMicro: 500_000, accountDailyRequests: 10 });
  });

  it("a mistyped or negative limit falls back to the default; it never becomes 'no limit'", () => {
    process.env.COACH_MONTHLY_BUDGET_USD = "ninety";
    process.env.COACH_DAILY_BUDGET_USD = "-1";
    process.env.COACH_ACCOUNT_DAILY_REQUESTS = "2.5";
    process.env.COACH_ACCOUNT_MONTHLY_BUDGET_USD = "Infinity";
    expect(coachLimits()).toEqual({ monthlyMicro: 90_000_000, dailyMicro: 6_000_000, accountMonthlyMicro: 500_000, accountDailyRequests: 10 });
    process.env.COACH_MONTHLY_BUDGET_USD = "40";
    process.env.COACH_ACCOUNT_DAILY_REQUESTS = "0";
    expect(coachLimits()).toMatchObject({ monthlyMicro: 40_000_000, accountDailyRequests: 0 });
  });

  it("a count that is negative or not a number is the default", () => {
    for (const bad of ["-3", "abc", "1e400"]) {
      process.env.COACH_ACCOUNT_DAILY_REQUESTS = bad;
      expect(coachLimits().accountDailyRequests, bad).toBe(10);
    }
  });

  it("Opus 5.5 and Haiku 5.5 are priced at their list rates", () => {
    expect(costOf("claude-opus-5-5", { input_tokens: 1_000_000, output_tokens: 1_000_000, cache_creation_input_tokens: 1_000_000, cache_read_input_tokens: 1_000_000 })).toBe(29_200_000);
    expect(costOf("claude-haiku-5-5", { input_tokens: 1_000_000, output_tokens: 1_000_000, cache_creation_input_tokens: 1_000_000, cache_read_input_tokens: 1_000_000 })).toBe(735_000);
  });

  it("a blank setting is the default", () => {
    process.env.COACH_MONTHLY_BUDGET_USD = "";
    process.env.COACH_DAILY_BUDGET_USD = "   ";
    process.env.COACH_ACCOUNT_DAILY_REQUESTS = " ";
    expect(coachLimits()).toMatchObject({ monthlyMicro: 90_000_000, dailyMicro: 6_000_000, accountDailyRequests: 10 });
  });

  it("a call whose worst case lands exactly on a cap is allowed; a micro-dollar more is not", () => {
    // The worst case here is 24,608 micro-dollars ($0.024608).
    for (const name of ["COACH_DAILY_BUDGET_USD", "COACH_MONTHLY_BUDGET_USD", "COACH_ACCOUNT_MONTHLY_BUDGET_USD"] as const) {
      clearCoachLedger();
      process.env[name] = "0.024608";
      expect(typeof reserve(), name).toBe("object");
      clearCoachLedger();
      process.env[name] = "0.024607";
      expect(typeof reserve(), name).toBe("string");
      delete process.env[name];
    }
  });

  it("a call in flight holds against the month, the account's month and the account's count, not only the day", () => {
    process.env.COACH_MONTHLY_BUDGET_USD = "0.03";
    reserve("acct_a");
    expect(reserve("acct_b")).toBe("monthly");
    clearCoachLedger();
    delete process.env.COACH_MONTHLY_BUDGET_USD;
    process.env.COACH_ACCOUNT_MONTHLY_BUDGET_USD = "0.03";
    reserve("acct_a");
    expect(reserve("acct_a")).toBe("account_monthly");
    clearCoachLedger();
    delete process.env.COACH_ACCOUNT_MONTHLY_BUDGET_USD;
    process.env.COACH_ACCOUNT_DAILY_REQUESTS = "1";
    reserve("acct_a");
    expect(reserve("acct_a")).toBe("account_daily");
  });

  it("an unpriced model is refused before anything is reserved", () => {
    expect(reserveCoachCall("acct_a", "claude-unknown", 100, 100, NOW)).toBe("unpriced_model");
  });

  it("an account gets its daily number of answers, then is refused; another account is not", async () => {
    process.env.COACH_ACCOUNT_DAILY_REQUESTS = "2";
    for (let i = 0; i < 2; i += 1) await reservation(reserve()).settle({ input_tokens: 100, output_tokens: 100 });
    expect(reserve()).toBe("account_daily");
    expect(typeof reserve("acct_b")).toBe("object");
    // The next UTC day it is served again.
    expect(typeof reserve("acct_a", new Date("2026-10-26T00:00:01Z"))).toBe("object");
  });

  it("an account's monthly spend is capped, checked against the call's worst case", async () => {
    process.env.COACH_ACCOUNT_MONTHLY_BUDGET_USD = "0.05";
    // Each worst case is $0.0246; one fits, the second would pass $0.05 only once the first is spent.
    await reservation(reserve()).settle(null); // a failure is charged its worst case
    expect(typeof reserve()).toBe("object");
    clearCoachLedger();
    process.env.COACH_ACCOUNT_MONTHLY_BUDGET_USD = "0.04";
    await reservation(reserve()).settle(null);
    expect(reserve()).toBe("account_monthly");
  });

  it("the day's cap and the month's cap apply across accounts", async () => {
    process.env.COACH_DAILY_BUDGET_USD = "0.03";
    await reservation(reserve("acct_a")).settle(null);
    expect(reserve("acct_b")).toBe("daily");
    clearCoachLedger();
    process.env.COACH_DAILY_BUDGET_USD = "6";
    process.env.COACH_MONTHLY_BUDGET_USD = "0.03";
    await reservation(reserve("acct_a")).settle(null);
    expect(reserve("acct_b")).toBe("monthly");
  });

  it("calls in flight hold their worst case, so two at once cannot overshoot a cap between them", () => {
    process.env.COACH_DAILY_BUDGET_USD = "0.03";
    const first = reserve("acct_a");
    expect(typeof first).toBe("object");
    // Nothing is spent yet, but the first call's $0.0246 is held.
    expect(reserve("acct_b")).toBe("daily");
  });
});

describe("settling", () => {
  it("replaces the reservation with the real cost, written through to storage", async () => {
    await reservation(reserve()).settle({ input_tokens: 2500, output_tokens: 600 });
    expect(coachSpend(NOW)).toEqual({ monthMicro: 11_000, dayMicro: 11_000 });
    expect(kv.rows.get("month:2026-10")).toEqual({ amount: 11_000 });
    expect(kv.rows.get("day:2026-10-25")).toEqual({ amount: 11_000 });
    expect(kv.rows.get("account:acct_a:2026-10")).toEqual({ amount: 11_000 });
    expect(kv.rows.get("count:acct_a:2026-10-25")).toEqual({ amount: 1 });
  });

  it("two calls in flight: settling one leaves the other's hold in place", async () => {
    process.env.COACH_DAILY_BUDGET_USD = "0.06";
    const first = reservation(reserve("acct_a"));
    const second = reservation(reserve("acct_b"));
    await first.settle({ input_tokens: 0, output_tokens: 0 });
    // $0.0246 still held for the second call: a third worst case ($0.0246) still fits under $0.06...
    expect(typeof reserve("acct_c")).toBe("object");
    // ...and with that one held too, a fourth does not.
    expect(reserve("acct_d")).toBe("daily");
    await second.settle(null);
  });

  it("a failed call is charged its whole reservation; settling twice charges once", async () => {
    const r = reservation(reserve());
    await r.settle(null);
    await r.settle({ input_tokens: 1, output_tokens: 1 });
    expect(coachSpend(NOW).monthMicro).toBe(24_608);
  });
});

describe("restarts", () => {
  it("this month's and today's rows are loaded back; older ones are deleted, not loaded", () => {
    // The loader judges rows by the real clock, so this test uses it too.
    const now = new Date();
    const month = now.toISOString().slice(0, 7);
    const day = now.toISOString().slice(0, 10);
    kv.hydrators.get("coach-spend")!([
      { key: `month:${month}`, value: { amount: 89_990_000 } },
      { key: `day:${day}`, value: { amount: 1_000 } },
      { key: "month:2020-01", value: { amount: 5 } },
      { key: "day:2020-01-01", value: { amount: 5 } },
      { key: `month:${month}x`, value: { amount: 5 } },
      { key: `count:acct_a:${day}`, value: { amount: "lots" } }
    ]);
    expect(kv.deleted).toEqual(["month:2020-01", "day:2020-01-01", `month:${month}x`]);
    expect(coachSpend(now)).toEqual({ monthMicro: 89_990_000, dayMicro: 1_000 });
    // $89.99 already spent this month: the next call's worst case does not fit under $90.
    expect(reserve("acct_new", now)).toBe("monthly");
  });

  it("a row whose amount is missing, not a number, or negative is not loaded", () => {
    const month = `month:${new Date().toISOString().slice(0, 7)}`;
    for (const value of [null, {}, { amount: "5" }, { amount: -5 }, { amount: null }]) {
      clearCoachLedger();
      kv.hydrators.get("coach-spend")!([{ key: month, value }]);
      expect(coachSpend().monthMicro, JSON.stringify(value)).toBe(0);
    }
  });

  it("only the current month's and day's keys count", () => {
    expect(isCurrentKey("month:2026-10", NOW)).toBe(true);
    expect(isCurrentKey("month:2026-09", NOW)).toBe(false);
    expect(isCurrentKey("day:2026-10-25", NOW)).toBe(true);
    expect(isCurrentKey("day:2026-10-24", NOW)).toBe(false);
    expect(isCurrentKey("account:x:2026-10", NOW)).toBe(true);
    expect(isCurrentKey("account:x:2026-09", NOW)).toBe(false);
    expect(isCurrentKey("count:x:2026-10-25", NOW)).toBe(true);
    expect(isCurrentKey("count:x:2026-10-24", NOW)).toBe(false);
    expect(isCurrentKey("other", NOW)).toBe(false);
    expect(isCurrentKey("other:2026-10-25", NOW)).toBe(false);
    expect(isCurrentKey("other:2026-10", NOW)).toBe(false);
  });

  it("past days are dropped from memory when the UTC day turns", async () => {
    await reservation(reserve()).settle({ input_tokens: 1000, output_tokens: 0 });
    const tomorrow = new Date("2026-10-26T00:00:01Z");
    reserve("acct_b", tomorrow); // the first call of a new day prunes
    expect(coachSpend(NOW).dayMicro).toBe(0);
    expect(coachSpend(tomorrow).monthMicro).toBe(2_000); // same month, still counted
  });
});
