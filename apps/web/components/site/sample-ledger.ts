// Zeno — the hero's sample ledger + its inline cancel flows. Shared by
// Hero.tsx (renders and plays them) and pen.tsx (the running-tally chip).
// Plain module, no "use client": this is data, not logic.
//
// These five are SAMPLE values, labeled as such in the UI. The flow scripts
// mirror real catalog guides in shape (open → fee check → retention traps →
// submitted) but are illustrative — the app walks the service's real steps.

export type SampleSub = { n: string; c: string; amt: number; meta: string };

export const SAMPLE_SUBS: readonly SampleSub[] = [
  { n: "Netflix", c: "#E50914", amt: 15.99, meta: "RENEWS JUL 28" },
  { n: "Adobe CC", c: "#FF3B30", amt: 54.99, meta: "RENEWS JUL 14 · DARK-PATTERN CANCEL" },
  { n: "Spotify", c: "#1DB954", amt: 10.99, meta: "RENEWS AUG 2" },
  { n: "Disney+", c: "#113CCF", amt: 13.99, meta: "TRIAL CONVERTS JUL 12" },
  { n: "iCloud+", c: "#3B82F6", amt: 2.99, meta: "RENEWS AUG 5" }
];

export const SAMPLE_BASE = SAMPLE_SUBS.reduce((a, s) => a + s.amt, 0);

export type FlowLine = { c: "run" | "fee" | "ok"; t: string } | { c: "trap"; pre: string; q: string };

export const CANCEL_FLOWS: Record<string, FlowLine[]> = {
  Netflix: [
    { c: "run", t: "OPENING NETFLIX → ACCOUNT → CANCEL MEMBERSHIP" },
    { c: "ok", t: "SUBMITTED — TWO TAPS, NO TRAPS" }
  ],
  "Adobe CC": [
    { c: "run", t: "OPENING ADOBE → PLANS → MANAGE PLAN" },
    { c: "fee", t: "FEE CHECK · TERM ENDS JUL 14 — CANCELLING TODAY COSTS $0" },
    { c: "trap", pre: "OFFER 1/3", q: "“50% OFF FOR 3 MONTHS”" },
    { c: "trap", pre: "OFFER 2/3", q: "“2 MONTHS FREE”" },
    { c: "trap", pre: "OFFER 3/3", q: "“SWITCH TO $9.99 PHOTOGRAPHY”" },
    { c: "ok", t: "SUBMITTED — 3 OFFERS DECLINED" }
  ],
  Spotify: [
    { c: "run", t: "OPENING SPOTIFY → ACCOUNT → YOUR PLAN" },
    { c: "ok", t: "SUBMITTED — ONE CONFIRM SCREEN" }
  ],
  "Disney+": [
    { c: "run", t: "OPENING ACCOUNT → SUBSCRIPTION → CANCEL" },
    { c: "trap", pre: "OFFER 1/1", q: "“STAY FOR $4.99/MO”" },
    { c: "ok", t: "SUBMITTED — TRIAL ENDS JUL 12, $0" }
  ],
  "iCloud+": [
    { c: "run", t: "SETTINGS → ICLOUD → MANAGE STORAGE" },
    { c: "ok", t: "SUBMITTED — DOWNGRADED TO 5 GB FREE" }
  ]
};

export const FLOW_GLYPH: Record<FlowLine["c"], string> = { run: "→", fee: "!", trap: "✕", ok: "✓" };

/* Hero dispatches this CustomEvent on every switch change; the running-tally
   chip listens. detail: { off: boolean[] } aligned with SAMPLE_SUBS. */
export const LEDGER_EVENT = "zeno:sample-ledger";
