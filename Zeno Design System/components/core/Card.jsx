import React from "react";

/**
 * Zeno Card — a document, not a floating tile. Hairline rule frame on paper,
 * no default shadow (delete-a-card test: use only when the content IS a
 * distinct document — statements, receipts, grouped ledgers).
 */
export function Card({
  padding = "md",
  interactive = false,
  elevated = false,
  onClick,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const pads = { none: 0, sm: "var(--space-3)", md: "var(--space-5)", lg: "var(--space-6)" };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
      style={{
        background: "var(--surface-card)",
        border: `1px solid ${hover ? "var(--border-default)" : "var(--rule)"}`,
        borderRadius: "var(--radius-md)",
        padding: pads[padding],
        boxShadow: elevated ? "var(--shadow-sm)" : "none",
        transform: hover ? "translateY(-1px)" : "none",
        transition: "border-color var(--dur-fast) var(--ease-out), transform var(--dur) var(--ease-out)",
        cursor: interactive ? "pointer" : "default",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
