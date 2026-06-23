import React from "react";

/**
 * Zeno Badge — compact status / metadata pill.
 * tone: neutral | accent | success | warning | danger | info
 * Soft (tinted) by default; solid for strong emphasis.
 */
export function Badge({ tone = "neutral", solid = false, dot = false, children, style, ...rest }) {
  const tones = {
    neutral: { soft: "var(--surface-sunken)", softText: "var(--text-secondary)", solid: "var(--ink-700)", dot: "var(--ink-400)" },
    accent: { soft: "var(--accent-soft)", softText: "var(--accent-text)", solid: "var(--accent)", dot: "var(--accent)" },
    success: { soft: "var(--success-soft)", softText: "var(--success)", solid: "var(--success)", dot: "var(--success)" },
    warning: { soft: "var(--warning-soft)", softText: "#B45309", solid: "var(--warning)", dot: "var(--warning)" },
    danger: { soft: "var(--danger-soft)", softText: "var(--danger)", solid: "var(--danger)", dot: "var(--danger)" },
    info: { soft: "var(--info-soft)", softText: "var(--info)", solid: "var(--info)", dot: "var(--info)" },
  };
  const t = tones[tone] || tones.neutral;
  const isSolidGreen = solid && tone === "accent";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 22,
        padding: "0 9px",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--fs-micro)",
        fontWeight: "var(--fw-semibold)",
        letterSpacing: "var(--ls-snug)",
        lineHeight: 1,
        color: solid ? (tone === "warning" || isSolidGreen ? "var(--ink-900)" : "#fff") : t.softText,
        background: solid ? t.solid : t.soft,
        borderRadius: "var(--radius-pill)",
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {dot && (
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: solid ? "currentColor" : t.dot, flex: "none" }} />
      )}
      {children}
    </span>
  );
}
