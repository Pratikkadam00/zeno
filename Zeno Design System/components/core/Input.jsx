import React from "react";

/**
 * Zeno Input — text field with optional label, prefix/suffix and icons.
 * Use prefix="$" for money entry (pairs with mono numerals).
 */
export function Input({
  label,
  hint,
  error,
  prefix,
  suffix,
  leftIcon,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled = false,
  mono = false,
  style,
  inputStyle,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const borderColor = error ? "var(--danger)" : focus ? "var(--accent)" : "var(--border-default)";

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "var(--font-sans)", ...style }}>
      {label && (
        <span style={{ fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--text-secondary)" }}>{label}</span>
      )}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 48,
          padding: "0 14px",
          background: disabled ? "var(--surface-sunken)" : "var(--surface-card)",
          border: `1.5px solid ${borderColor}`,
          borderRadius: "var(--radius-md)",
          boxShadow: focus ? `0 0 0 4px var(--focus-ring)` : "none",
          transition: "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
        }}
      >
        {leftIcon && <span style={{ display: "inline-flex", color: "var(--text-tertiary)" }}>{leftIcon}</span>}
        {prefix && <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontWeight: 500 }}>{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
            fontSize: "var(--fs-body)",
            fontWeight: mono ? 600 : 400,
            color: "var(--text-primary)",
            ...inputStyle,
          }}
          {...rest}
        />
        {suffix && <span style={{ color: "var(--text-tertiary)", fontSize: "var(--fs-body-sm)" }}>{suffix}</span>}
      </span>
      {(hint || error) && (
        <span style={{ fontSize: "var(--fs-caption)", color: error ? "var(--danger)" : "var(--text-tertiary)" }}>{error || hint}</span>
      )}
    </label>
  );
}
