import React from "react";

/**
 * Zeno Button — ledger-language action primitive.
 * primary = solid ink (paper text). Green is reserved for money-positive
 * moments, never generic CTAs. Press = stamp-down (scale 0.97 + settle).
 * RN: withSpring(scale, { damping: 22, stiffness: 260 }); haptic impactAsync(Medium) on primary.
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
      bg: "var(--ink-panel)", bgHover: "var(--ink-800)", bgActive: "var(--ink-700)",
      color: "var(--paper)", border: "transparent", shadow: "var(--shadow-xs)",
    },
    money: { // money-positive action — the only green button
      bg: "var(--accent)", bgHover: "var(--accent-hover)", bgActive: "var(--accent-pressed)",
      color: "var(--text-on-accent)", border: "transparent",
      shadow: hover ? "var(--shadow-accent)" : "var(--shadow-xs)",
    },
    secondary: {
      bg: "var(--surface-card)", bgHover: "var(--surface-sunken)", bgActive: "var(--ink-75)",
      color: "var(--text-primary)", border: "var(--border-default)", shadow: "none",
    },
    ghost: {
      bg: hover ? "var(--surface-sunken)" : "transparent", bgHover: "var(--surface-sunken)",
      bgActive: "var(--ink-75)", color: "var(--text-primary)", border: "transparent", shadow: "none",
    },
    danger: { // outlined red — real alerts only, never solid panic
      bg: hover ? "var(--danger-soft)" : "var(--surface-card)", bgHover: "var(--danger-soft)",
      bgActive: "var(--danger-soft)", color: "var(--danger)", border: "color-mix(in srgb, var(--danger) 45%, transparent)", shadow: "none",
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
        transform: active && !disabled ? "translateY(0.5px) scale(0.97)" : "none",
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
