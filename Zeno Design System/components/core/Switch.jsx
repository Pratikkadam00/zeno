import React from "react";

/**
 * Zeno Switch — iOS-style toggle. Green when on, gentle spring on the knob.
 */
export function Switch({ checked = false, onChange, disabled = false, size = "md", style, ...rest }) {
  const dims = size === "sm" ? { w: 40, h: 24, k: 18 } : { w: 50, h: 30, k: 24 };
  const pad = (dims.h - dims.k) / 2;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!checked)}
      style={{
        position: "relative",
        width: dims.w,
        height: dims.h,
        flex: "none",
        padding: 0,
        border: "none",
        borderRadius: "var(--radius-pill)",
        background: checked ? "var(--accent)" : "var(--ink-200)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background var(--dur) var(--ease-out)",
        ...style,
      }}
      {...rest}
    >
      <span
        style={{
          position: "absolute",
          top: pad,
          left: checked ? dims.w - dims.k - pad : pad,
          width: dims.k,
          height: dims.k,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(16,20,30,0.3)",
          transition: "left var(--dur) var(--ease-spring)",
        }}
      />
    </button>
  );
}
