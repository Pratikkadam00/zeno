import React from "react";

/**
 * Zeno SegmentedControl — iOS-style segmented tabs. Controlled.
 * options: array of { value, label } or strings.
 */
export function SegmentedControl({ options = [], value, onChange, size = "md", fullWidth = true, style, ...rest }) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const h = size === "sm" ? 32 : 40;

  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        width: fullWidth ? "100%" : "auto",
        padding: 3,
        gap: 2,
        background: "var(--surface-sunken)",
        borderRadius: "var(--radius-md)",
        ...style,
      }}
      {...rest}
    >
      {opts.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange && onChange(o.value)}
            style={{
              flex: fullWidth ? 1 : "none",
              height: h,
              padding: "0 16px",
              border: "none",
              borderRadius: "var(--radius-sm)",
              background: selected ? "var(--surface-card)" : "transparent",
              boxShadow: selected ? "var(--shadow-xs)" : "none",
              color: selected ? "var(--text-primary)" : "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--fs-body-sm)",
              fontWeight: "var(--fw-semibold)",
              letterSpacing: "var(--ls-snug)",
              cursor: "pointer",
              transition: "background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
