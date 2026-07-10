/* AUTO-GENERATED from components/core/*.jsx — self-contained primitives for the UI kit & slides.
   Do not edit by hand; mirrors the design-system source. */

// ===== Icon =====
/**
 * Zeno Icon — renders a Lucide icon by name.
 * Requires the Lucide CDN script to be present on the page
 * (<script src="https://unpkg.com/lucide@latest"></script>).
 * Names are kebab-case Lucide names: "wallet", "calendar", "chevron-right"…
 */
let _styleInjected = false;
function ensureStyle() {
  if (_styleInjected || typeof document === "undefined") return;
  _styleInjected = true;
  const el = document.createElement("style");
  el.textContent =
    "span[data-zeno-icon]>svg{width:100%;height:100%;display:block;stroke-width:var(--zeno-icon-sw,2)}";
  document.head.appendChild(el);
}

function Icon({ name, size = 20, color = "currentColor", strokeWidth = 2, style, ...rest }) {
  const ref = React.useRef(null);
  ensureStyle();
  React.useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = "";
    const i = document.createElement("i");
    i.setAttribute("data-lucide", name);
    host.appendChild(i);
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }, [name]);

  return (
    <span
      ref={ref}
      data-zeno-icon={name}
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        color,
        flex: "none",
        "--zeno-icon-sw": strokeWidth,
        ...style,
      }}
      {...rest}
    />
  );
}

// ===== Button =====
/**
 * Zeno Button — ledger-language action primitive.
 * primary = solid ink (paper text). Green is reserved for money-positive
 * moments, never generic CTAs. Press = stamp-down (scale 0.97 + settle).
 * RN: withSpring(scale, { damping: 22, stiffness: 260 }); haptic impactAsync(Medium) on primary.
 */
function Button({
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

// ===== IconButton =====
/**
 * Zeno IconButton — icon-only tappable control (toolbars, nav, list actions).
 * variant: ghost | secondary | primary. shape: round | square.
 */
function IconButton({
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

// ===== Card =====
/**
 * Zeno Card — a document, not a floating tile. Hairline rule frame on paper,
 * no default shadow (delete-a-card test: use only when the content IS a
 * distinct document — statements, receipts, grouped ledgers).
 */
function Card({
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

// ===== Badge =====
/**
 * Zeno Badge — ledger tick-tag. Caps-mono micro text with a colored status
 * tick, no pill chrome (identical pills everywhere is banned). `solid`
 * renders an inverse ink chip for the rare urgent tag.
 */
function Badge({ tone = "neutral", solid = false, dot = false, hollow = false, children, style, ...rest }) {
  const tones = {
    neutral: { text: "var(--text-tertiary)", tick: "var(--ink-300)" },
    accent: { text: "var(--accent-text)", tick: "var(--accent)" },
    success: { text: "var(--stamp-verified)", tick: "var(--stamp-verified)" },
    warning: { text: "#A36A0B", tick: "var(--warning)" },
    danger: { text: "var(--stamp-alert)", tick: "var(--stamp-alert)" },
    info: { text: "var(--info)", tick: "var(--info)" },
    pro: { text: "var(--text-secondary)", tick: "var(--ink-400)" },
  };
  const t = tones[tone] || tones.neutral;

  if (solid) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 20, padding: "0 8px", fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--paper)", background: tone === "danger" ? "var(--stamp-alert)" : "var(--ink-panel)", borderRadius: 4, whiteSpace: "nowrap", ...style }} {...rest}>
        {children}
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: t.text, whiteSpace: "nowrap", ...style }} {...rest}>
      <span style={{ width: 10, height: 3, background: hollow ? "transparent" : t.tick, border: hollow ? `1px solid ${t.tick}` : "none", flex: "none" }}></span>
      {children}
    </span>
  );
}

// ===== CategoryTag =====
const CAT_COLORS = {
  green: "var(--cat-green)",
  blue: "var(--cat-blue)",
  violet: "var(--cat-violet)",
  amber: "var(--cat-amber)",
  coral: "var(--cat-coral)",
  teal: "var(--cat-teal)",
  pink: "var(--cat-pink)",
  slate: "var(--cat-slate)",
};

/**
 * Zeno CategoryTag — a colored chip for subscription categories
 * (Entertainment, Music, Productivity…). Pass a category color name or a hex.
 */
function CategoryTag({ color = "slate", children, style, ...rest }) {
  const c = CAT_COLORS[color] || color;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 24,
        padding: "0 10px 0 8px",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--fs-caption)",
        fontWeight: "var(--fw-medium)",
        color: "var(--text-secondary)",
        background: "var(--surface-sunken)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-pill)",
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, flex: "none" }} />
      {children}
    </span>
  );
}

// ===== ServiceAvatar =====
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
function ServiceAvatar({ name = "", src, color, size = 44, shape = "rounded", style, ...rest }) {
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

// ===== Input =====
/**
 * Zeno Input — text field with optional label, prefix/suffix and icons.
 * Use prefix="$" for money entry (pairs with mono numerals).
 */
function Input({
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

// ===== Switch =====
/**
 * Zeno Switch — iOS-style toggle. Green when on, gentle spring on the knob.
 */
function Switch({ checked = false, onChange, disabled = false, size = "md", style, ...rest }) {
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

// ===== ProgressBar =====
/**
 * Zeno ProgressBar — budget / usage meter. Auto-warns as it fills:
 * green under 75%, amber 75–99%, red at/over 100% (unless `color` is set).
 */
function ProgressBar({ value = 0, max = 100, color, height = 8, showLabel = false, label, style, ...rest }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const autoColor = pct >= 100 ? "var(--danger)" : pct >= 75 ? "var(--warning)" : "var(--accent)";
  const fill = color || autoColor;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }} {...rest}>
      {showLabel && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-caption)", color: "var(--text-secondary)" }}>
          <span style={{ fontWeight: "var(--fw-medium)" }}>{label}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{Math.round(pct)}%</span>
        </div>
      )}
      <div style={{ width: "100%", height, background: "var(--surface-sunken)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: fill,
            borderRadius: "var(--radius-pill)",
            transition: "width var(--dur-slow) var(--ease-out), background var(--dur) var(--ease-out)",
          }}
        />
      </div>
    </div>
  );
}

// ===== ListRow =====
/**
 * Zeno ListRow — a ledger entry. Signature: the Ledger Line — a dotted
 * leader running from the text block to the mono amount, like a receipt.
 * Rows sit on paper separated by hairline rules; no card nesting.
 * RN: press = impactAsync(Light); entrance = FadeInDown stagger 45ms.
 */
function ListRow({
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

// ===== AmountDisplay =====
/**
 * Zeno AmountDisplay — the canonical money figure. Mono, tabular, with a
 * superscript currency, optional cadence suffix and trend indicator.
 */
function AmountDisplay({
  amount = 0,
  currency = "$",
  cadence,
  size = "lg",
  trend,
  trendValue,
  color = "var(--text-primary)",
  style,
  ...rest
}) {
  const sizes = { sm: 20, md: 28, lg: 40, xl: 56 };
  const fs = sizes[size] || sizes.lg;
  const [whole, frac] = Number(amount).toFixed(2).split(".");
  const trendColor = trend === "up" ? "var(--danger)" : trend === "down" ? "var(--success)" : "var(--text-tertiary)";

  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontFamily: "var(--font-mono)", ...style }} {...rest}>
      <span style={{ display: "inline-flex", alignItems: "baseline", color, letterSpacing: "var(--ls-tight)", fontFeatureSettings: "'tnum' 1" }}>
        <span style={{ fontSize: fs * 0.5, fontWeight: 600, alignSelf: "flex-start", marginTop: fs * 0.12, opacity: 0.7 }}>{currency}</span>
        <span style={{ fontSize: fs, fontWeight: 700, lineHeight: 1 }}>{whole}</span>
        <span style={{ fontSize: fs * 0.5, fontWeight: 600, opacity: 0.6 }}>.{frac}</span>
      </span>
      {cadence && (
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--fs-body-sm)", fontWeight: 500, color: "var(--text-tertiary)" }}>/{cadence}</span>
      )}
      {trend && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontFamily: "var(--font-sans)", fontSize: "var(--fs-body-sm)", fontWeight: 600, color: trendColor }}>
          {trend === "up" ? "▲" : "▼"} {trendValue}
        </span>
      )}
    </div>
  );
}

// ===== SegmentedControl =====
/**
 * Zeno SegmentedControl — iOS-style segmented tabs. Controlled.
 * options: array of { value, label } or strings.
 */
function SegmentedControl({ options = [], value, onChange, size = "md", fullWidth = true, style, ...rest }) {
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

Object.assign(window, { Icon, Button, IconButton, Card, Badge, CategoryTag, ServiceAvatar, Input, Switch, ProgressBar, ListRow, AmountDisplay, SegmentedControl });
