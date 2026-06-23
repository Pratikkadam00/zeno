import React from "react";

const CAT_COLORS = {
  green: "var(--cat-green)",
  blue: "var(--cat-blue)",
  violet: "var(--cat-violet)",
  amber: "var(--cat-amber)",
  coral: "var(--cat-coral)",
  teal: "var(--cat-teal)",
  pink: "var(--cat-pink)",
  slate: "var(--cat-slate)",
};

/**
 * Zeno CategoryTag — a colored chip for subscription categories
 * (Entertainment, Music, Productivity…). Pass a category color name or a hex.
 */
export function CategoryTag({ color = "slate", children, style, ...rest }) {
  const c = CAT_COLORS[color] || color;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 24,
        padding: "0 10px 0 8px",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--fs-caption)",
        fontWeight: "var(--fw-medium)",
        color: "var(--text-secondary)",
        background: "var(--surface-sunken)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-pill)",
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, flex: "none" }} />
      {children}
    </span>
  );
}
