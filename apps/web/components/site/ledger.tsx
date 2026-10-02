// Zeno — server-safe ledger marks. NO "use client": these render as static
// markup, without shipping a byte of client JS.
import type { CSSProperties, ReactNode } from "react";

/* ① The Ledger Line — label ……… mono value. The signature row. */
export function LedgerLine({
  label,
  sub,
  value,
  valueColor,
  strong = false,
  size = 15,
  style
}: {
  label: ReactNode;
  sub?: ReactNode;
  value: ReactNode;
  valueColor?: string;
  strong?: boolean;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "8px 0", ...style }}>
      <span style={{ flex: "none", fontSize: size, fontWeight: strong ? 700 : 500, color: strong ? "var(--ink)" : "var(--ink-2)" }}>
        {label}
        {sub ? (
          <span
            className="money"
            style={{ fontSize: Math.round(size * 0.66), fontWeight: 700, color: "var(--ink-3)", marginLeft: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}
          >
            {sub}
          </span>
        ) : null}
      </span>
      <span aria-hidden="true" style={{ flex: 1, borderBottom: "2px dotted var(--rule-strong)", transform: "translateY(-3px)", minWidth: 14 }} />
      <span className="money" style={{ flex: "none", fontSize: size + 1, fontWeight: 700, color: valueColor ?? "var(--ink)" }}>
        {value}
      </span>
    </div>
  );
}

/* ③b Column heads — lists are tables. */
export function ColumnHeads({ left, right, style }: { left: ReactNode; right: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingBottom: 7, borderBottom: "1px solid var(--rule-strong)", ...style }}>
      <span className="money" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "var(--ink-3)" }}>{left}</span>
      <span className="money" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "var(--ink-3)" }}>{right}</span>
    </div>
  );
}

/* Tick-tag — caps-mono status with a colored tick (no pill chrome). */
const TICK_TONES: Record<string, string> = {
  neutral: "var(--ink-3)",
  green: "var(--green-text)",
  verified: "var(--stamp-verified)",
  warn: "var(--warn)",
  alert: "var(--stamp-alert)",
  info: "var(--info)"
};

export function TickTag({
  tone = "neutral",
  hollow = false,
  children,
  style
}: {
  tone?: keyof typeof TICK_TONES | string;
  hollow?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const c = TICK_TONES[tone] ?? tone;
  return (
    <span
      className="money"
      style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: c, whiteSpace: "nowrap", ...style }}
    >
      <span aria-hidden="true" style={{ width: 11, height: 3, background: hollow ? "transparent" : c, border: hollow ? `1px solid ${c}` : "none", flex: "none" }} />
      {children}
    </span>
  );
}
