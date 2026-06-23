import React from "react";

/**
 * Zeno ProgressBar — budget / usage meter. Auto-warns as it fills:
 * green under 75%, amber 75–99%, red at/over 100% (unless `color` is set).
 */
export function ProgressBar({ value = 0, max = 100, color, height = 8, showLabel = false, label, style, ...rest }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const autoColor = pct >= 100 ? "var(--danger)" : pct >= 75 ? "var(--warning)" : "var(--accent)";
  const fill = color || autoColor;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }} {...rest}>
      {showLabel && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-caption)", color: "var(--text-secondary)" }}>
          <span style={{ fontWeight: "var(--fw-medium)" }}>{label}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{Math.round(pct)}%</span>
        </div>
      )}
      <div style={{ width: "100%", height, background: "var(--surface-sunken)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: fill,
            borderRadius: "var(--radius-pill)",
            transition: "width var(--dur-slow) var(--ease-out), background var(--dur) var(--ease-out)",
          }}
        />
      </div>
    </div>
  );
}
