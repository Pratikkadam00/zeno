import React from "react";

const PALETTE = ["var(--cat-violet)", "var(--cat-blue)", "var(--cat-coral)", "var(--cat-amber)", "var(--cat-teal)", "var(--cat-green)", "var(--cat-pink)", "var(--cat-slate)"];
function pick(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % PALETTE.length;
  return PALETTE[h];
}

/**
 * Zeno ServiceAvatar — the brand tile for a subscription (Netflix, Spotify…).
 * Shows a logo image if `src` is given, else the initial on a deterministic color.
 */
export function ServiceAvatar({ name = "", src, color, size = 44, shape = "rounded", style, ...rest }) {
  const bg = color || pick(name);
  const radius = shape === "circle" ? "var(--radius-pill)" : "var(--radius-md)";
  const initial = (name.trim()[0] || "?").toUpperCase();

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: radius,
        background: src ? "var(--surface-sunken)" : bg,
        color: "#fff",
        overflow: "hidden",
        flex: "none",
        fontFamily: "var(--font-display)",
        fontSize: size * 0.42,
        fontWeight: "var(--fw-bold)",
        boxShadow: "inset 0 0 0 1px rgba(16,20,30,0.05)",
        ...style,
      }}
      {...rest}
    >
      {src ? (
        <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initial
      )}
    </span>
  );
}
