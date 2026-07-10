import React from "react";
import { Icon } from "./Icon.jsx";

/**
 * Zeno ListRow — a ledger entry. Signature: the Ledger Line — a dotted
 * leader running from the text block to the mono amount, like a receipt.
 * Rows sit on paper separated by hairline rules; no card nesting.
 * RN: press = impactAsync(Light); entrance = FadeInDown stagger 45ms.
 */
export function ListRow({
  leading,
  title,
  subtitle,
  amount,
  cadence,
  trailing,
  leader = true,
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
        minHeight: 44,
        background: clickable && hover ? "var(--surface-sunken)" : "transparent",
        borderBottom: divider ? "1px solid var(--rule)" : "none",
        cursor: clickable ? "pointer" : "default",
        transition: "background var(--dur-fast) var(--ease-out)",
        ...style,
      }}
      {...rest}
    >
      {leading && <span style={{ flex: "none" }}>{leading}</span>}
      <div style={{ flex: "none", minWidth: 0, maxWidth: "58%" }}>
        <div style={{ fontSize: "var(--fs-body)", fontWeight: "var(--fw-semibold)", color: "var(--text-primary)", letterSpacing: "var(--ls-snug)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.02em", color: "var(--text-tertiary)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div>
        )}
      </div>
      {/* The Ledger Line — dotted leader */}
      {leader && (amount != null || trailing != null) ? (
        <span aria-hidden="true" style={{ flex: 1, borderBottom: "2px dotted var(--rule-strong)", transform: "translateY(3px)", minWidth: 12 }}></span>
      ) : (
        <span style={{ flex: 1 }}></span>
      )}
      {trailing != null ? (
        <span style={{ flex: "none" }}>{trailing}</span>
      ) : amount != null ? (
        <div style={{ flex: "none", textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-body)", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "var(--ls-snug)", fontFeatureSettings: "'tnum' 1" }}>{amount}</div>
          {cadence && <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", marginTop: 1 }}>/{cadence}</div>}
        </div>
      ) : null}
      {chevron && <Icon name="chevron-right" size={16} color="var(--text-tertiary)" />}
    </div>
  );
}
