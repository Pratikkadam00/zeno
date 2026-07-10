import React from "react";

/**
 * Zeno Badge — ledger tick-tag. Caps-mono micro text with a colored status
 * tick, no pill chrome (identical pills everywhere is banned). `solid`
 * renders an inverse ink chip for the rare urgent tag.
 */
export function Badge({ tone = "neutral", solid = false, dot = false, hollow = false, children, style, ...rest }) {
  const tones = {
    neutral: { text: "var(--text-tertiary)", tick: "var(--ink-300)" },
    accent: { text: "var(--accent-text)", tick: "var(--accent)" },
    success: { text: "var(--stamp-verified)", tick: "var(--stamp-verified)" },
    warning: { text: "#A36A0B", tick: "var(--warning)" },
    danger: { text: "var(--stamp-alert)", tick: "var(--stamp-alert)" },
    info: { text: "var(--info)", tick: "var(--info)" },
    pro: { text: "var(--text-secondary)", tick: "var(--ink-400)" },
  };
  const t = tones[tone] || tones.neutral;

  if (solid) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 20, padding: "0 8px", fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--paper)", background: tone === "danger" ? "var(--stamp-alert)" : "var(--ink-panel)", borderRadius: 4, whiteSpace: "nowrap", ...style }} {...rest}>
        {children}
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: t.text, whiteSpace: "nowrap", ...style }} {...rest}>
      <span style={{ width: 10, height: 3, background: hollow ? "transparent" : t.tick, border: hollow ? `1px solid ${t.tick}` : "none", flex: "none" }}></span>
      {children}
    </span>
  );
}
