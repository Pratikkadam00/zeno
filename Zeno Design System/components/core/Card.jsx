import React from "react";

/**
 * Zeno Card — the base surface. Hairline border + soft shadow.
 * padding: none | sm | md | lg. interactive adds a hover lift.
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
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: pads[padding],
        boxShadow: hover ? "var(--shadow-md)" : elevated ? "var(--shadow-sm)" : "var(--shadow-xs)",
        transform: hover ? "translateY(-2px)" : "none",
        transition: "box-shadow var(--dur) var(--ease-out), transform var(--dur) var(--ease-out)",
        cursor: interactive ? "pointer" : "default",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
