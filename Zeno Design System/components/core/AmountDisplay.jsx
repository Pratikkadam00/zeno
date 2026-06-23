import React from "react";

/**
 * Zeno AmountDisplay — the canonical money figure. Mono, tabular, with a
 * superscript currency, optional cadence suffix and trend indicator.
 */
export function AmountDisplay({
  amount = 0,
  currency = "$",
  cadence,
  size = "lg",
  trend,
  trendValue,
  color = "var(--text-primary)",
  style,
  ...rest
}) {
  const sizes = { sm: 20, md: 28, lg: 40, xl: 56 };
  const fs = sizes[size] || sizes.lg;
  const [whole, frac] = Number(amount).toFixed(2).split(".");
  const trendColor = trend === "up" ? "var(--danger)" : trend === "down" ? "var(--success)" : "var(--text-tertiary)";

  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontFamily: "var(--font-mono)", ...style }} {...rest}>
      <span style={{ display: "inline-flex", alignItems: "baseline", color, letterSpacing: "var(--ls-tight)", fontFeatureSettings: "'tnum' 1" }}>
        <span style={{ fontSize: fs * 0.5, fontWeight: 600, alignSelf: "flex-start", marginTop: fs * 0.12, opacity: 0.7 }}>{currency}</span>
        <span style={{ fontSize: fs, fontWeight: 700, lineHeight: 1 }}>{whole}</span>
        <span style={{ fontSize: fs * 0.5, fontWeight: 600, opacity: 0.6 }}>.{frac}</span>
      </span>
      {cadence && (
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--fs-body-sm)", fontWeight: 500, color: "var(--text-tertiary)" }}>/{cadence}</span>
      )}
      {trend && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontFamily: "var(--font-sans)", fontSize: "var(--fs-body-sm)", fontWeight: 600, color: trendColor }}>
          {trend === "up" ? "▲" : "▼"} {trendValue}
        </span>
      )}
    </div>
  );
}
