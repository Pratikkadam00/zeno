import { kvDelete, kvPersistAwait, registerHydrator, type StoredEntry } from "./storage/pg";

// What the AI coach may spend, and what it has spent (F247, U7.10 / R33).
//
// The owner's Anthropic account has a $100 monthly limit. That limit is the
// outer wall: when it is hit, Anthropic refuses every call until the month
// turns. This ledger is the inner one, set below it, so the coach stops
// cleanly (the app shows its on-device insights) before the outer wall does,
// and so one day, or one account, cannot use the month up.
//
// Money is counted in micro-dollars (integers), from each response's own
// usage figures and the price table below. Before a call, the WORST case for
// that call is reserved (its input estimated high, its full max_tokens of
// output), so requests running at the same time cannot overshoot a cap
// between them; after the call the reservation is replaced by the real cost.
// A call that fails is charged its whole reservation: it may still have been
// billed, and this ledger must never count less than Anthropic does.
//
// All dates are UTC (docs/ENGINEERING_STANDARDS.md): the day and the month
// turn at 00:00 UTC.

/** USD per million tokens, from Anthropic's price list (read 2026-10-25). */
type Price = { input: number; output: number; cacheWrite: number; cacheRead: number };

// Only models with a price here can be used: a model without one would be
// spending money this ledger cannot count, so the coach refuses to call it.
export const MODEL_PRICES: Readonly<Record<string, Price>> = {
  // cacheWrite is the 5-minute TTL rate, 1.25x input.
  "claude-sonnet-5-5": { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01 },
  "claude-opus-5-5": { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 }
};

export type CoachUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

const MICRO = 1_000_000;

function readUsd(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  // A mistyped limit must not become "no limit": anything unreadable or
  // negative falls back to the default, never to Infinity.
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function readCount(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

/**
 * The caps, read each time so a change on Render applies without a deploy.
 * Defaults: $90 a month (under the account's $100), $6 a day (two days of a
 * month's average, so a busy day is served and a runaway one is stopped),
 * and per account 10 fresh answers a day and $0.50 a month.
 */
export function coachLimits(): { monthlyMicro: number; dailyMicro: number; accountMonthlyMicro: number; accountDailyRequests: number } {
  return {
    monthlyMicro: Math.round(readUsd("COACH_MONTHLY_BUDGET_USD", 90) * MICRO),
    dailyMicro: Math.round(readUsd("COACH_DAILY_BUDGET_USD", 6) * MICRO),
    accountMonthlyMicro: Math.round(readUsd("COACH_ACCOUNT_MONTHLY_BUDGET_USD", 0.5) * MICRO),
    accountDailyRequests: readCount("COACH_ACCOUNT_DAILY_REQUESTS", 10)
  };
}

/** What a response cost, in micro-dollars, rounded up. Unknown model: null. */
export function costOf(model: string, usage: CoachUsage): number | null {
  const price = MODEL_PRICES[model];
  if (!price) return null;
  const dollarsTimesMillion =
    usage.input_tokens * price.input +
    usage.output_tokens * price.output +
    (usage.cache_creation_input_tokens ?? 0) * price.cacheWrite +
    (usage.cache_read_input_tokens ?? 0) * price.cacheRead;
  // tokens x (USD per million tokens) is already micro-dollars.
  return Math.ceil(dollarsTimesMillion);
}

/**
 * The most a call can cost: its input estimated high (one token per three
 * characters; English runs nearer four) and every output token it is allowed.
 */
export function worstCaseCost(model: string, promptChars: number, maxTokens: number): number | null {
  const estimatedInput = Math.ceil(promptChars / 3) + 64;
  return costOf(model, { input_tokens: estimatedInput, output_tokens: maxTokens });
}

function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}
function utcMonth(now: Date): string {
  return now.toISOString().slice(0, 7);
}

// ledger key → micro-dollars (or, for "count:" keys, requests)
const ledger = new Map<string, number>();
// Reservations not yet settled, by the same keys.
const reserved = new Map<string, number>();

const NAMESPACE = "coach-spend";

function keysFor(accountId: string, now: Date) {
  const day = utcDay(now);
  const month = utcMonth(now);
  return {
    month: `month:${month}`,
    day: `day:${day}`,
    accountMonth: `account:${accountId}:${month}`,
    accountDayCount: `count:${accountId}:${day}`
  };
}

const read = (key: string): number => (ledger.get(key) ?? 0) + (reserved.get(key) ?? 0);

async function add(key: string, amount: number): Promise<void> {
  const next = (ledger.get(key) ?? 0) + amount;
  ledger.set(key, next);
  // Written through so a restart keeps the month's spend. A failed write is
  // logged by the storage layer; the in-memory figure still counts.
  await kvPersistAwait(NAMESPACE, key, { amount: next });
}

function hold(key: string, amount: number): void {
  reserved.set(key, (reserved.get(key) ?? 0) + amount);
}
function release(key: string, amount: number): void {
  // Every release follows its own hold, so the key is always there.
  const left = (reserved.get(key) as number) - amount;
  if (left > 0) reserved.set(key, left);
  else reserved.delete(key);
}

export type CoachRefusal = "monthly" | "daily" | "account_monthly" | "account_daily" | "unpriced_model";

export type Reservation = {
  /** Settle with the response's usage, or with null when the call failed. */
  settle: (usage: CoachUsage | null) => Promise<void>;
};

/**
 * Reserve a call's worst case against every cap, or say which cap refuses it.
 * Nothing is reserved when the answer is a refusal.
 */
export function reserveCoachCall(accountId: string, model: string, promptChars: number, maxTokens: number, now: Date = new Date()): Reservation | CoachRefusal {
  pruneStale(now);
  const worst = worstCaseCost(model, promptChars, maxTokens);
  if (worst === null) return "unpriced_model";
  const limits = coachLimits();
  const keys = keysFor(accountId, now);

  if (read(keys.accountDayCount) + 1 > limits.accountDailyRequests) return "account_daily";
  if (read(keys.accountMonth) + worst > limits.accountMonthlyMicro) return "account_monthly";
  if (read(keys.day) + worst > limits.dailyMicro) return "daily";
  if (read(keys.month) + worst > limits.monthlyMicro) return "monthly";

  const held: Array<[string, number]> = [[keys.month, worst], [keys.day, worst], [keys.accountMonth, worst], [keys.accountDayCount, 1]];
  for (const [key, amount] of held) hold(key, amount);

  let settled = false;
  return {
    settle: async (usage) => {
      if (settled) return;
      settled = true;
      for (const [key, amount] of held) release(key, amount);
      // The model has a price: the reservation was refused otherwise.
      const actual = usage ? (costOf(model, usage) as number) : worst;
      await Promise.all([add(keys.month, actual), add(keys.day, actual), add(keys.accountMonth, actual), add(keys.accountDayCount, 1)]);
    }
  };
}

/** Spend so far, for the operator's status line and the tests. */
export function coachSpend(now: Date = new Date()): { monthMicro: number; dayMicro: number } {
  return { monthMicro: ledger.get(`month:${utcMonth(now)}`) ?? 0, dayMicro: ledger.get(`day:${utcDay(now)}`) ?? 0 };
}

export function clearCoachLedger(): void {
  ledger.clear();
  reserved.clear();
  // Stryker disable next-line StringLiteral: equivalent; an empty ledger has nothing to prune either way
  prunedFor = "";
}

// Rows from earlier months and days are not loaded, and are deleted: only
// this month, and today, can refuse a call.
export function isCurrentKey(key: string, now: Date = new Date()): boolean {
  const day = utcDay(now);
  const month = utcMonth(now);
  if (key.startsWith("month:")) return key === `month:${month}`;
  if (key.startsWith("day:")) return key === `day:${day}`;
  if (key.startsWith("account:")) return key.endsWith(`:${month}`);
  if (key.startsWith("count:")) return key.endsWith(`:${day}`);
  return false;
}

// The in-memory figures for days and months that have ended, dropped once a
// day so a long-running server does not keep every account's past days.
// Stryker disable next-line StringLiteral: equivalent; any starting value differs from a real day, so the first call prunes
let prunedFor = "";
function pruneStale(now: Date): void {
  const day = utcDay(now);
  // Stryker disable next-line ConditionalExpression: equivalent; pruning on every call only costs time
  if (day === prunedFor) return;
  prunedFor = day;
  for (const key of [...ledger.keys()]) {
    if (!isCurrentKey(key, now) && !reserved.has(key)) ledger.delete(key);
  }
}

registerHydrator(NAMESPACE, (entries: StoredEntry[]) => {
  const now = new Date();
  for (const { key, value } of entries) {
    const amount = (value as { amount?: unknown } | null)?.amount;
    if (!isCurrentKey(key, now)) {
      kvDelete(NAMESPACE, key);
      continue;
    }
    // Stryker disable next-line EqualityOperator,LogicalOperator: equivalent; a loaded 0 reads as an absent row, and JSON carries no NaN or Infinity
    if (typeof amount === "number" && Number.isFinite(amount) && amount >= 0) ledger.set(key, amount);
  }
});
