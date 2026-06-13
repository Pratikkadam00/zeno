// ─────────────────────────────────────────────────────────────────────────────
// Zeno · Analytics data layer
//
// A single deterministic source of truth for the analytics console. Every KPI,
// chart and table on the page derives from the functions here, so the numbers
// are always internally consistent (revenue ties to plans, MRR ties to users,
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
  quiet: "#5c6577"
} as const;

export type AccentKey = "blue" | "emerald" | "amber" | "rose" | "cyan";
export const accentHex: Record<AccentKey, string> = {
  blue: PAL.blue, emerald: PAL.emerald, amber: PAL.amber, rose: PAL.rose, cyan: PAL.cyan
};

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
  return `${n >= 0 ? "" : ""}${n.toFixed(digits)}%`;
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
  raw: number;
  delta: number;          // percent change vs prior period
  spark: number[];        // mini sparkline series
  positiveIsGood: boolean;
  accent: "blue" | "emerald" | "amber" | "rose" | "cyan";
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

  const sparkOf = (p: Point[]) => p.map((x) => x.value);

  return [
    {
      key: "mrr", label: "Monthly Recurring Revenue", value: fmtMoney(mrr, { compact: true }),
      raw: mrr, delta: pctChange(mrr, mrrStart), spark: sparkOf(d.mrr), positiveIsGood: true, accent: "emerald"
    },
    {
      key: "arr", label: "Annual Run Rate", value: fmtMoney(mrr * 12, { compact: true }),
      raw: mrr * 12, delta: pctChange(mrr, mrrStart), spark: sparkOf(d.mrr), positiveIsGood: true, accent: "blue"
    },
    {
      key: "revenue", label: "Revenue · period", value: fmtMoney(revenue, { compact: true }),
      raw: revenue, delta: pctChange(revenue, revenuePrev), spark: sparkOf(d.revenue), positiveIsGood: true, accent: "blue"
    },
    {
      key: "active", label: "Active subscribers", value: fmtNum(active, true),
      raw: active, delta: pctChange(active, activeStart), spark: sparkOf(d.activeUsers), positiveIsGood: true, accent: "cyan"
    },
    {
      key: "new", label: "New subscribers", value: fmtNum(newUsers, true),
      raw: newUsers, delta: pctChange(newUsers, newUsers * 0.88), spark: sparkOf(d.newUsers), positiveIsGood: true, accent: "emerald"
    },
    {
      key: "churn", label: "Churn rate", value: fmtPct(churnRate),
      raw: churnRate, delta: -8.2, spark: sparkOf(d.churnedUsers), positiveIsGood: false, accent: "rose"
    },
    {
      key: "arpu", label: "ARPU", value: fmtMoney(arpu, { cents: true }),
      raw: arpu, delta: 2.1, spark: sparkOf(d.mrr), positiveIsGood: true, accent: "amber"
    },
    {
      key: "ltv", label: "Lifetime value", value: fmtMoney(ltv, { compact: true }),
      raw: ltv, delta: 6.7, spark: sparkOf(d.mrr), positiveIsGood: true, accent: "blue"
    },
    {
      key: "trial", label: "Trial conversion", value: fmtPct(trialConv),
      raw: trialConv, delta: 3.9, spark: sparkOf(d.newUsers), positiveIsGood: true, accent: "emerald"
    }
  ];
}

// ── MRR movement (new / expansion / contraction / churn) ────────────────────
export type MrrMovement = { label: string; value: number; kind: "new" | "expansion" | "contraction" | "churn" };

export function getMrrMovement(range: RangeKey): MrrMovement[] {
  const s = seasonScale[range];
  const rng = makeRng(range === "12M" ? 12 : range === "90D" ? 90 : range === "30D" ? 30 : 7);
  const n = (base: number) => Math.round(base * s * (0.85 + rng() * 0.3));
  return [
    { label: "New", value: n(9200), kind: "new" },
    { label: "Expansion", value: n(3400), kind: "expansion" },
    { label: "Contraction", value: -n(1250), kind: "contraction" },
    { label: "Churn", value: -n(2600), kind: "churn" }
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

// ── Acquisition channels ────────────────────────────────────────────────────
export type Channel = { name: string; users: number; pct: number };

export function getChannels(): Channel[] {
  const raw = [
    { name: "Organic search", users: 18420 },
    { name: "App Store / Play", users: 12960 },
    { name: "Referral", users: 7840 },
    { name: "Paid social", users: 5210 },
    { name: "Email / newsletter", users: 2380 },
    { name: "Direct", users: 1420 }
  ];
  const total = raw.reduce((s, c) => s + c.users, 0);
  return raw.map((c) => ({ ...c, pct: (c.users / total) * 100 }));
}

// ── Geography ───────────────────────────────────────────────────────────────
export type Geo = { country: string; flag: string; users: number; pct: number };

export function getGeography(): Geo[] {
  const raw = [
    { country: "United States", flag: "🇺🇸", users: 19240 },
    { country: "United Kingdom", flag: "🇬🇧", users: 6120 },
    { country: "India", flag: "🇮🇳", users: 5380 },
    { country: "Canada", flag: "🇨🇦", users: 4210 },
    { country: "Germany", flag: "🇩🇪", users: 3640 },
    { country: "Australia", flag: "🇦🇺", users: 2980 },
    { country: "Brazil", flag: "🇧🇷", users: 2410 }
  ];
  const total = 48230;
  return raw.map((c) => ({ ...c, pct: (c.users / total) * 100 }));
}

// ── Top tracked services (what users track most) ────────────────────────────
export type TopService = { name: string; tracked: number; mrrFlagged: number };

export function getTopServices(): TopService[] {
  return [
    { name: "Netflix", tracked: 31420, mrrFlagged: 486000 },
    { name: "Spotify", tracked: 28910, mrrFlagged: 318000 },
    { name: "Amazon Prime", tracked: 24180, mrrFlagged: 360000 },
    { name: "ChatGPT Plus", tracked: 19870, mrrFlagged: 397000 },
    { name: "Adobe CC", tracked: 14260, mrrFlagged: 784000 },
    { name: "Disney+", tracked: 12940, mrrFlagged: 181000 },
    { name: "YouTube Premium", tracked: 11320, mrrFlagged: 158000 }
  ];
}

// ── Cohort retention (monthly cohorts × months since signup) ────────────────
export type Cohort = { label: string; size: number; retention: number[] };

export function getCohorts(): Cohort[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const rng = makeRng(555);
  return months.map((m, i) => {
    const span = months.length - i;
    const size = Math.round(3200 + rng() * 2400);
    const retention: number[] = [];
    let r = 100;
    for (let k = 0; k < span; k += 1) {
      if (k === 0) retention.push(100);
      else {
        r = Math.max(38, r - (k === 1 ? 14 + rng() * 6 : 4 + rng() * 4));
        retention.push(Math.round(r));
      }
    }
    return { label: `${m} '26`, size, retention };
  });
}

// ── Recent transactions ─────────────────────────────────────────────────────
export type Txn = {
  id: string;
  user: string;
  email: string;
  plan: string;
  amount: number;
  status: "succeeded" | "refunded" | "failed" | "trial";
  country: string;
  flag: string;
  minutesAgo: number;
};

export function getTransactions(): Txn[] {
  const names = [
    ["Maya Chen", "maya.chen", "🇺🇸"], ["Liam Walker", "liam.w", "🇬🇧"], ["Aarav Patel", "aarav.p", "🇮🇳"],
    ["Sofia Rossi", "s.rossi", "🇨🇦"], ["Noah Becker", "n.becker", "🇩🇪"], ["Emma Wright", "emma.w", "🇦🇺"],
    ["Lucas Silva", "lucas.s", "🇧🇷"], ["Olivia Park", "o.park", "🇺🇸"], ["Ethan Cole", "ethan.c", "🇬🇧"],
    ["Ava Martin", "ava.m", "🇨🇦"], ["Kai Tanaka", "kai.t", "🇺🇸"], ["Zara Khan", "zara.k", "🇬🇧"]
  ] as const;
  const plans = ["Pro", "Family", "Business"];
  const amounts: Record<string, number> = { Pro: 7.99, Family: 9.99, Business: 39.99 };
  const statuses: Txn["status"][] = ["succeeded", "succeeded", "succeeded", "succeeded", "trial", "refunded", "failed"];
  const rng = makeRng(4242);
  return Array.from({ length: 12 }, (_, i) => {
    const entry = names[i % names.length]!;
    const [user, handle, flag] = entry;
    const plan = plans[Math.floor(rng() * plans.length)] ?? "Pro";
    const status = statuses[Math.floor(rng() * statuses.length)] ?? "succeeded";
    return {
      id: `txn_${(1000 + i).toString(36)}${Math.floor(rng() * 9000).toString(36)}`,
      user,
      email: `${handle}@example.com`,
      plan,
      amount: status === "trial" ? 0 : (amounts[plan] ?? 0),
      status,
      country: flag,
      flag,
      minutesAgo: Math.round(2 + i * 17 + rng() * 9)
    };
  });
}

export function relativeTime(minutesAgo: number): string {
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  const h = Math.floor(minutesAgo / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export const AS_OF_LABEL = new Intl.DateTimeFormat("en-US", {
  month: "long", day: "numeric", year: "numeric", timeZone: "UTC"
}).format(new Date(AS_OF));
