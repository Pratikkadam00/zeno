import React from "react";

/**
 * Zeno Button — the primary action primitive.
 * Variants: primary (Zeno green), secondary (outline), ghost, danger.
 * Sizes: sm | md | lg. Supports leftIcon / rightIcon and fullWidth.
 */
export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  leftIcon = null,
  rightIcon = null,
  type = "button",
  onClick,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);

  const sizes = {
    sm: { h: 36, px: 14, fs: "var(--fs-body-sm)", gap: 6, radius: "var(--radius-sm)" },
    md: { h: 44, px: 18, fs: "var(--fs-body)", gap: 8, radius: "var(--radius-md)" },
    lg: { h: 52, px: 24, fs: "var(--fs-body-lg)", gap: 10, radius: "var(--radius-md)" },
  };
  const s = sizes[size] || sizes.md;

  const variants = {
    primary: {
      bg: "var(--accent)",
      bgHover: "var(--accent-hover)",
      bgActive: "var(--accent-pressed)",
      color: "var(--text-on-accent)",
      border: "transparent",
      shadow: hover ? "var(--shadow-accent)" : "var(--shadow-xs)",
    },
    secondary: {
      bg: "var(--surface-card)",
      bgHover: "var(--surface-sunken)",
      bgActive: "var(--ink-75)",
      color: "var(--text-primary)",
      border: "var(--border-default)",
      shadow: "var(--shadow-xs)",
    },
    ghost: {
      bg: hover ? "var(--surface-sunken)" : "transparent",
      bgHover: "var(--surface-sunken)",
      bgActive: "var(--ink-75)",
      color: "var(--text-primary)",
      border: "transparent",
      shadow: "none",
    },
    danger: {
      bg: "var(--danger)",
      bgHover: "#E11D48",
      bgActive: "#BE123C",
      color: "#fff",
      border: "transparent",
      shadow: "var(--shadow-xs)",
    },
  };
  const v = variants[variant] || variants.primary;
  const bg = disabled ? "var(--surface-sunken)" : active ? v.bgActive : hover ? v.bgHover : v.bg;

  return (
    <button
      type={type}
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
        gap: s.gap,
        height: s.h,
        padding: `0 ${s.px}px`,
        width: fullWidth ? "100%" : "auto",
        fontFamily: "var(--font-sans)",
        fontSize: s.fs,
        fontWeight: "var(--fw-semibold)",
        letterSpacing: "var(--ls-snug)",
        lineHeight: 1,
        color: disabled ? "var(--text-disabled)" : v.color,
        background: bg,
        border: `1px solid ${disabled ? "var(--border-subtle)" : v.border}`,
        borderRadius: s.radius,
        boxShadow: disabled ? "none" : v.shadow,
        cursor: disabled ? "not-allowed" : "pointer",
        transform: active && !disabled ? "translateY(0.5px) scale(0.985)" : "none",
        transition: "background var(--dur-fast) var(--ease-out), box-shadow var(--dur) var(--ease-out), transform var(--dur-fast) var(--ease-out)",
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {leftIcon && <span style={{ display: "inline-flex", margin: "0 -2px" }}>{leftIcon}</span>}
      {children}
      {rightIcon && <span style={{ display: "inline-flex", margin: "0 -2px" }}>{rightIcon}</span>}
    </button>
  );
}
