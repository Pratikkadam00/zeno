// Zeno — server-safe ledger marks. NO "use client": these render as static
// markup, so the 509 SSG cancel guides and every utility page can use them
// without shipping a byte of client JS.
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

/* ③ Section head — caps-mono kicker with a trailing hairline. */
export function SectionHead({ children, right, style }: { children: ReactNode; right?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, ...style }}>
      <span
        className="money"
        style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-3)", whiteSpace: "nowrap" }}
      >
        {children}
      </span>
      <span aria-hidden="true" style={{ flex: 1, borderBottom: "1px solid var(--rule)" }} />
      {right}
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

/* ② The Zeno Stamp — double-ruled, rotated, EARNED verified moments only.
   The homepage uses it exactly once (the verify beat). */
export function Stamp({
  tone = "verified",
  sub,
  angle = -5,
  children,
  className,
  style
}: {
  tone?: "verified" | "alert" | "neutral";
  sub?: ReactNode;
  angle?: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const color = tone === "alert" ? "var(--stamp-alert)" : tone === "neutral" ? "var(--ink-3)" : "var(--stamp-verified)";
  return (
    <span
      className={`money ${className ?? ""}`}
      style={
        {
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          padding: "10px 18px",
          border: `2.5px solid ${color}`,
          outline: `1px solid ${color}`,
          outlineOffset: 3,
          borderRadius: 7,
          color,
          transform: `rotate(${angle}deg)`,
          opacity: 0.95,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          "--stamp-angle": `${angle}deg`,
          ...style
        } as CSSProperties
      }
    >
      <span style={{ fontSize: 14, lineHeight: 1 }}>{children}</span>
      {sub ? <span style={{ fontSize: 9, letterSpacing: "0.2em", opacity: 0.75 }}>{sub}</span> : null}
    </span>
  );
}

/* Numbered ruled row — guide steps, method beats. */
export function RuledStep({ n, children, style }: { n: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "baseline", padding: "13px 0", borderBottom: "1px solid var(--rule)", ...style }}>
      <span className="money" style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)", flex: "none" }}>{String(n).padStart(2, "0")}</span>
      <span style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink)" }}>{children}</span>
    </div>
  );
}
