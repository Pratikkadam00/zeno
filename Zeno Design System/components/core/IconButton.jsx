import React from "react";

/**
 * Zeno IconButton — icon-only tappable control (toolbars, nav, list actions).
 * variant: ghost | secondary | primary. shape: round | square.
 */
export function IconButton({
  variant = "ghost",
  size = 40,
  shape = "round",
  disabled = false,
  label,
  onClick,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);

  const variants = {
    ghost: { bg: hover ? "var(--surface-sunken)" : "transparent", color: "var(--text-secondary)", border: "transparent" },
    secondary: { bg: hover ? "var(--surface-sunken)" : "var(--surface-card)", color: "var(--text-primary)", border: "var(--border-default)" },
    primary: { bg: hover ? "var(--accent-hover)" : "var(--accent)", color: "var(--text-on-accent)", border: "transparent" },
  };
  const v = variants[variant] || variants.ghost;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        color: disabled ? "var(--text-disabled)" : v.color,
        background: disabled ? "transparent" : v.bg,
        border: `1px solid ${v.border}`,
        borderRadius: shape === "round" ? "var(--radius-pill)" : "var(--radius-md)",
        cursor: disabled ? "not-allowed" : "pointer",
        transform: active && !disabled ? "scale(0.92)" : "none",
        transition: "background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-spring)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
