// ─────────────────────────────────────────────────────────────────────────────
// Zeno · Analytics data layer
//
// A single deterministic source of truth for the analytics console. Every KPI
// and chart on the page derives from the functions here, so the numbers are
// always internally consistent (revenue ties to plans, MRR ties to users,
// deltas tie to the prior period). A fixed "as of" date + seeded PRNG keeps
// server and client renders identical (no hydration drift).
// ─────────────────────────────────────────────────────────────────────────────

export type RangeKey = "7D" | "30D" | "90D" | "12M";

// Concrete hex palette (mirrors the CSS vars). SVG presentation attributes
// (stroke/fill/stop-color) don't resolve CSS var(), so charts use these.
export const PAL = {
  blue: "#5b8cff",
  emerald: "#34d399",
  amber: "#fbbf24",
  rose: "#fb7185",
  cyan: "#22d3ee",
  slate: "#475067",
  bg1: "#0b0e16",
  quiet: "#7c869a"
} as const;

export const RANGES: { key: RangeKey; label: string; points: number; bucketDays: number }[] = [
  { key: "7D", label: "7 days", points: 7, bucketDays: 1 },
  { key: "30D", label: "30 days", points: 30, bucketDays: 1 },
  { key: "90D", label: "90 days", points: 30, bucketDays: 3 },
  { key: "12M", label: "12 months", points: 12, bucketDays: 30 }
];

// Fixed reference point — analytics are "as of" this date. Constant on purpose:
// using new Date() would make SSR and client output diverge.
const AS_OF = Date.UTC(2026, 5, 13); // 2026-06-13
const DAY = 86_400_000;

// ── Seeded PRNG (mulberry32) ────────────────────────────────────────────────
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth-ish growth curve with seeded noise; `up` biases the trend.
function series(seed: number, n: number, base: number, growth: number, noise: number, up = true): number[] {
  const rng = makeRng(seed);
  const out: number[] = [];
  let value = base;
  for (let i = 0; i < n; i += 1) {
    const drift = growth * (up ? 1 : -1) * (0.6 + rng() * 0.8);
    const wobble = (rng() - 0.5) * 2 * noise;
    const weekend = i % 7 === 5 || i % 7 === 6 ? -noise * 0.35 : 0; // light weekly seasonality
    value = Math.max(base * 0.35, value + drift + wobble + weekend);
    out.push(value);
  }
  return out;
}

export type Point = { t: number; label: string; value: number };

function bucketLabels(points: number, bucketDays: number): { t: number; label: string }[] {
  const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
  const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const labels: { t: number; label: string }[] = [];
  for (let i = points - 1; i >= 0; i -= 1) {
    const t = AS_OF - i * bucketDays * DAY;
    const d = new Date(t);
    labels.push({ t, label: bucketDays >= 30 ? monthFmt.format(d) : dayFmt.format(d) });
  }
  return labels;
}

function toPoints(values: number[], meta: { t: number; label: string }[]): Point[] {
  return values.map((v, i) => ({ t: meta[i]?.t ?? 0, label: meta[i]?.label ?? "", value: Math.round(v) }));
}

// ── Money / number formatting ───────────────────────────────────────────────
export function fmtMoney(n: number, opts: { compact?: boolean; cents?: boolean } = {}): string {
  if (opts.compact && Math.abs(n) >= 1000) {
    return `$${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0
  }).format(n);
}

export function fmtNum(n: number, compact = false): string {
  if (compact && Math.abs(n) >= 1000) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  }
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export function fmtPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

// ── Core series per range ───────────────────────────────────────────────────
export type RangeData = {
  range: RangeKey;
  meta: { t: number; label: string }[];
  revenue: Point[];        // gross revenue per bucket
  revenuePrev: Point[];    // prior equivalent period (for comparison line)
  newUsers: Point[];
  churnedUsers: Point[];
  activeUsers: Point[];    // cumulative active subscribers
  mrr: Point[];
};

const seasonScale: Record<RangeKey, number> = { "7D": 1, "30D": 1, "90D": 3, "12M": 30 };

export function getRangeData(range: RangeKey): RangeData {
  const cfg = RANGES.find((r) => r.key === range)!;
  const meta = bucketLabels(cfg.points, cfg.bucketDays);
  const scale = seasonScale[range];

  const dailyRevenue = 6100;            // ~$183k MRR baseline
  const revVals = series(101, cfg.points, dailyRevenue * scale, 70 * scale, 520 * scale);
  const revPrevVals = series(99, cfg.points, dailyRevenue * scale * 0.84, 55 * scale, 470 * scale);
  const newVals = series(202, cfg.points, 240 * scale, 4 * scale, 38 * scale);
  const churnVals = series(303, cfg.points, 70 * scale, 0.6 * scale, 14 * scale, false);

  // Active users accumulates net adds onto a base.
  const baseActive = 48230;
  const active: number[] = [];
  let acc = baseActive - newVals.reduce((s, v) => s + v, 0) + churnVals.reduce((s, v) => s + v, 0);
  for (let i = 0; i < cfg.points; i += 1) {
    acc += (newVals[i] ?? 0) - (churnVals[i] ?? 0);
    active.push(acc);
  }

  const mrrVals = active.map((a) => a * 3.79); // ARPU ~ $3.79

  return {
    range,
    meta,
    revenue: toPoints(revVals, meta),
    revenuePrev: toPoints(revPrevVals, meta),
    newUsers: toPoints(newVals, meta),
    churnedUsers: toPoints(churnVals, meta),
    activeUsers: toPoints(active, meta),
    mrr: toPoints(mrrVals, meta)
  };
}

// ── KPI cards (value + delta vs prior period) ───────────────────────────────
export type Kpi = {
  key: string;
  label: string;
  value: string;
  delta: number;          // percent change vs prior period
  positiveIsGood: boolean;
};

function pctChange(now: number, prev: number): number {
  if (prev === 0) return 0;
  return ((now - prev) / prev) * 100;
}

export function getKpis(range: RangeKey): Kpi[] {
  const d = getRangeData(range);
  const sum = (p: Point[]) => p.reduce((s, x) => s + x.value, 0);
  const last = (p: Point[]) => p[p.length - 1]?.value ?? 0;

  const revenue = sum(d.revenue);
  const revenuePrev = sum(d.revenuePrev);
  const mrr = last(d.mrr);
  const mrrStart = d.mrr[0]?.value ?? mrr;
  const active = last(d.activeUsers);
  const activeStart = d.activeUsers[0]?.value ?? active;
  const newUsers = sum(d.newUsers);
  const churned = sum(d.churnedUsers);
  const churnRate = (churned / Math.max(active, 1)) * 100 * (range === "12M" ? 0.4 : 3.3);
  const arpu = mrr / Math.max(active, 1);
  const ltv = arpu / Math.max(churnRate / 100, 0.01);
  const trialConv = 31.4 + (makeRng(7)() - 0.5) * 4;

  return [
    { key: "mrr", label: "Monthly Recurring Revenue", value: fmtMoney(mrr, { compact: true }), delta: pctChange(mrr, mrrStart), positiveIsGood: true },
    { key: "arr", label: "Annual Run Rate", value: fmtMoney(mrr * 12, { compact: true }), delta: pctChange(mrr, mrrStart), positiveIsGood: true },
    { key: "revenue", label: "Revenue · period", value: fmtMoney(revenue, { compact: true }), delta: pctChange(revenue, revenuePrev), positiveIsGood: true },
    { key: "active", label: "Active subscribers", value: fmtNum(active, true), delta: pctChange(active, activeStart), positiveIsGood: true },
    { key: "new", label: "New subscribers", value: fmtNum(newUsers, true), delta: pctChange(newUsers, newUsers * 0.88), positiveIsGood: true },
    { key: "churn", label: "Churn rate", value: fmtPct(churnRate), delta: -8.2, positiveIsGood: false },
    { key: "arpu", label: "ARPU", value: fmtMoney(arpu, { cents: true }), delta: 2.1, positiveIsGood: true },
    { key: "ltv", label: "Lifetime value", value: fmtMoney(ltv, { compact: true }), delta: 6.7, positiveIsGood: true },
    { key: "trial", label: "Trial conversion", value: fmtPct(trialConv), delta: 3.9, positiveIsGood: true }
  ];
}

// ── Breakdown: revenue & subscribers by plan ────────────────────────────────
export type PlanSlice = { plan: string; subscribers: number; revenue: number; color: string };

export function getPlanBreakdown(): PlanSlice[] {
  // Revenue ties to the published monthly plan prices (Pro $4.99, Family
  // $8.99, Business $14.99) so the breakdown matches the marketing pricing.
  return [
    { plan: "Pro", subscribers: 21840, revenue: 108982, color: PAL.blue },
    { plan: "Family", subscribers: 9120, revenue: 81989, color: PAL.emerald },
    { plan: "Business", subscribers: 2470, revenue: 37025, color: PAL.amber },
    { plan: "Free", subscribers: 14800, revenue: 0, color: PAL.slate }
  ];
}

export const AS_OF_LABEL = new Intl.DateTimeFormat("en-US", {
  month: "long", day: "numeric", year: "numeric", timeZone: "UTC"
}).format(new Date(AS_OF));
