import React from "react";
import { Icon } from "./Icon.jsx";

/**
 * Zeno ListRow — a single subscription line: brand tile, name + meta,
 * trailing amount/cadence and an optional chevron. The core building
 * block of the dashboard and lists.
 */
export function ListRow({
  leading,
  title,
  subtitle,
  amount,
  cadence,
  trailing,
  chevron = false,
  onClick,
  divider = false,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const clickable = !!onClick;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: clickable && hover ? "var(--surface-sunken)" : "transparent",
        borderBottom: divider ? "1px solid var(--border-subtle)" : "none",
        borderRadius: "var(--radius-md)",
        cursor: clickable ? "pointer" : "default",
        transition: "background var(--dur-fast) var(--ease-out)",
        ...style,
      }}
      {...rest}
    >
      {leading && <span style={{ flex: "none" }}>{leading}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--fs-body)", fontWeight: "var(--fw-semibold)", color: "var(--text-primary)", letterSpacing: "var(--ls-snug)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-tertiary)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div>
        )}
      </div>
      {trailing != null ? (
        <span style={{ flex: "none" }}>{trailing}</span>
      ) : amount != null ? (
        <div style={{ flex: "none", textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-body)", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "var(--ls-snug)" }}>{amount}</div>
          {cadence && <div style={{ fontSize: "var(--fs-caption)", color: "var(--text-tertiary)" }}>/{cadence}</div>}
        </div>
      ) : null}
      {chevron && <Icon name="chevron-right" size={18} color="var(--text-tertiary)" />}
    </div>
  );
}
