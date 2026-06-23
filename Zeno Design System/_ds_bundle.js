/* @ds-bundle: {"format":3,"namespace":"ZenoDesignSystem_12971a","components":[{"name":"AmountDisplay","sourcePath":"components/core/AmountDisplay.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"CategoryTag","sourcePath":"components/core/CategoryTag.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"ListRow","sourcePath":"components/core/ListRow.jsx"},{"name":"ProgressBar","sourcePath":"components/core/ProgressBar.jsx"},{"name":"SegmentedControl","sourcePath":"components/core/SegmentedControl.jsx"},{"name":"ServiceAvatar","sourcePath":"components/core/ServiceAvatar.jsx"},{"name":"Switch","sourcePath":"components/core/Switch.jsx"}],"sourceHashes":{"components/core/AmountDisplay.jsx":"de3965052ce1","components/core/Badge.jsx":"11cbfe7c0b19","components/core/Button.jsx":"ed1eb8c0d0d6","components/core/Card.jsx":"1c97753ece85","components/core/CategoryTag.jsx":"9961526a7a31","components/core/Icon.jsx":"3c10804cd886","components/core/IconButton.jsx":"009df706edb3","components/core/Input.jsx":"e16e4a18f1eb","components/core/ListRow.jsx":"03ed36449014","components/core/ProgressBar.jsx":"054e8ce3fffe","components/core/SegmentedControl.jsx":"78e579f2fc0a","components/core/ServiceAvatar.jsx":"65891a22381b","components/core/Switch.jsx":"4b6eae1dbd19","ui_kits/app/AddSubscriptionScreen.jsx":"99f58869da7a","ui_kits/app/BudgetRecapScreen.jsx":"40aeb72596a0","ui_kits/app/BudgetScreen.jsx":"66db15a9ca0b","ui_kits/app/CalendarScreen.jsx":"4e423ab3e903","ui_kits/app/CancelFlowScreen.jsx":"03a4f1cf569e","ui_kits/app/Chrome.jsx":"9d43a4c9ae95","ui_kits/app/DiscoverScreen.jsx":"94a98064f69b","ui_kits/app/HomeScreen.jsx":"3215f903a68b","ui_kits/app/InsightsScreen.jsx":"f1302dfd15b3","ui_kits/app/OnboardingScreen.jsx":"fa1be01fdefe","ui_kits/app/PaywallScreen.jsx":"6869f73624d6","ui_kits/app/SettingsScreen.jsx":"41c6f6bb9937","ui_kits/app/SubscriptionDetailScreen.jsx":"7d4c4ab95db7","ui_kits/app/SubscriptionsScreen.jsx":"f80c18d5bd34","ui_kits/app/data.js":"41d1b3026559"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.ZenoDesignSystem_12971a = window.ZenoDesignSystem_12971a || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/AmountDisplay.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
  const sizes = {
    sm: 20,
    md: 28,
    lg: 40,
    xl: 56
  };
  const fs = sizes[size] || sizes.lg;
  const [whole, frac] = Number(amount).toFixed(2).split(".");
  const trendColor = trend === "up" ? "var(--danger)" : trend === "down" ? "var(--success)" : "var(--text-tertiary)";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 8,
      fontFamily: "var(--font-mono)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "baseline",
      color,
      letterSpacing: "var(--ls-tight)",
      fontFeatureSettings: "'tnum' 1"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: fs * 0.5,
      fontWeight: 600,
      alignSelf: "flex-start",
      marginTop: fs * 0.12,
      opacity: 0.7
    }
  }, currency), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: fs,
      fontWeight: 700,
      lineHeight: 1
    }
  }, whole), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: fs * 0.5,
      fontWeight: 600,
      opacity: 0.6
    }
  }, ".", frac)), cadence && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--fs-body-sm)",
      fontWeight: 500,
      color: "var(--text-tertiary)"
    }
  }, "/", cadence), trend && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 2,
      fontFamily: "var(--font-sans)",
      fontSize: "var(--fs-body-sm)",
      fontWeight: 600,
      color: trendColor
    }
  }, trend === "up" ? "▲" : "▼", " ", trendValue));
}
Object.assign(__ds_scope, { AmountDisplay });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/AmountDisplay.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Zeno Badge — compact status / metadata pill.
 * tone: neutral | accent | success | warning | danger | info
 * Soft (tinted) by default; solid for strong emphasis.
 */
function Badge({
  tone = "neutral",
  solid = false,
  dot = false,
  children,
  style,
  ...rest
}) {
  const tones = {
    neutral: {
      soft: "var(--surface-sunken)",
      softText: "var(--text-secondary)",
      solid: "var(--ink-700)",
      dot: "var(--ink-400)"
    },
    accent: {
      soft: "var(--accent-soft)",
      softText: "var(--accent-text)",
      solid: "var(--accent)",
      dot: "var(--accent)"
    },
    success: {
      soft: "var(--success-soft)",
      softText: "var(--success)",
      solid: "var(--success)",
      dot: "var(--success)"
    },
    warning: {
      soft: "var(--warning-soft)",
      softText: "#B45309",
      solid: "var(--warning)",
      dot: "var(--warning)"
    },
    danger: {
      soft: "var(--danger-soft)",
      softText: "var(--danger)",
      solid: "var(--danger)",
      dot: "var(--danger)"
    },
    info: {
      soft: "var(--info-soft)",
      softText: "var(--info)",
      solid: "var(--info)",
      dot: "var(--info)"
    }
  };
  const t = tones[tone] || tones.neutral;
  const isSolidGreen = solid && tone === "accent";
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      height: 22,
      padding: "0 9px",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--fs-micro)",
      fontWeight: "var(--fw-semibold)",
      letterSpacing: "var(--ls-snug)",
      lineHeight: 1,
      color: solid ? tone === "warning" || isSolidGreen ? "var(--ink-900)" : "#fff" : t.softText,
      background: solid ? t.solid : t.soft,
      borderRadius: "var(--radius-pill)",
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: solid ? "currentColor" : t.dot,
      flex: "none"
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Zeno Button — the primary action primitive.
 * Variants: primary (Zeno green), secondary (outline), ghost, danger.
 * Sizes: sm | md | lg. Supports leftIcon / rightIcon and fullWidth.
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
    sm: {
      h: 36,
      px: 14,
      fs: "var(--fs-body-sm)",
      gap: 6,
      radius: "var(--radius-sm)"
    },
    md: {
      h: 44,
      px: 18,
      fs: "var(--fs-body)",
      gap: 8,
      radius: "var(--radius-md)"
    },
    lg: {
      h: 52,
      px: 24,
      fs: "var(--fs-body-lg)",
      gap: 10,
      radius: "var(--radius-md)"
    }
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: {
      bg: "var(--accent)",
      bgHover: "var(--accent-hover)",
      bgActive: "var(--accent-pressed)",
      color: "var(--text-on-accent)",
      border: "transparent",
      shadow: hover ? "var(--shadow-accent)" : "var(--shadow-xs)"
    },
    secondary: {
      bg: "var(--surface-card)",
      bgHover: "var(--surface-sunken)",
      bgActive: "var(--ink-75)",
      color: "var(--text-primary)",
      border: "var(--border-default)",
      shadow: "var(--shadow-xs)"
    },
    ghost: {
      bg: hover ? "var(--surface-sunken)" : "transparent",
      bgHover: "var(--surface-sunken)",
      bgActive: "var(--ink-75)",
      color: "var(--text-primary)",
      border: "transparent",
      shadow: "none"
    },
    danger: {
      bg: "var(--danger)",
      bgHover: "#E11D48",
      bgActive: "#BE123C",
      color: "#fff",
      border: "transparent",
      shadow: "var(--shadow-xs)"
    }
  };
  const v = variants[variant] || variants.primary;
  const bg = disabled ? "var(--surface-sunken)" : active ? v.bgActive : hover ? v.bgHover : v.bg;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
    style: {
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
      ...style
    }
  }, rest), leftIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      margin: "0 -2px"
    }
  }, leftIcon), children, rightIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      margin: "0 -2px"
    }
  }, rightIcon));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Zeno Card — the base surface. Hairline border + soft shadow.
 * padding: none | sm | md | lg. interactive adds a hover lift.
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
  const pads = {
    none: 0,
    sm: "var(--space-3)",
    md: "var(--space-5)",
    lg: "var(--space-6)"
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => interactive && setHover(true),
    onMouseLeave: () => interactive && setHover(false),
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      padding: pads[padding],
      boxShadow: hover ? "var(--shadow-md)" : elevated ? "var(--shadow-sm)" : "var(--shadow-xs)",
      transform: hover ? "translateY(-2px)" : "none",
      transition: "box-shadow var(--dur) var(--ease-out), transform var(--dur) var(--ease-out)",
      cursor: interactive ? "pointer" : "default",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/CategoryTag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CAT_COLORS = {
  green: "var(--cat-green)",
  blue: "var(--cat-blue)",
  violet: "var(--cat-violet)",
  amber: "var(--cat-amber)",
  coral: "var(--cat-coral)",
  teal: "var(--cat-teal)",
  pink: "var(--cat-pink)",
  slate: "var(--cat-slate)"
};

/**
 * Zeno CategoryTag — a colored chip for subscription categories
 * (Entertainment, Music, Productivity…). Pass a category color name or a hex.
 */
function CategoryTag({
  color = "slate",
  children,
  style,
  ...rest
}) {
  const c = CAT_COLORS[color] || color;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
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
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: c,
      flex: "none"
    }
  }), children);
}
Object.assign(__ds_scope, { CategoryTag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/CategoryTag.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
  el.textContent = "span[data-zeno-icon]>svg{width:100%;height:100%;display:block;stroke-width:var(--zeno-icon-sw,2)}";
  document.head.appendChild(el);
}
function Icon({
  name,
  size = 20,
  color = "currentColor",
  strokeWidth = 2,
  style,
  ...rest
}) {
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
  return /*#__PURE__*/React.createElement("span", _extends({
    ref: ref,
    "data-zeno-icon": name,
    style: {
      display: "inline-flex",
      width: size,
      height: size,
      color,
      flex: "none",
      "--zeno-icon-sw": strokeWidth,
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
    ghost: {
      bg: hover ? "var(--surface-sunken)" : "transparent",
      color: "var(--text-secondary)",
      border: "transparent"
    },
    secondary: {
      bg: hover ? "var(--surface-sunken)" : "var(--surface-card)",
      color: "var(--text-primary)",
      border: "var(--border-default)"
    },
    primary: {
      bg: hover ? "var(--accent-hover)" : "var(--accent)",
      color: "var(--text-on-accent)",
      border: "transparent"
    }
  };
  const v = variants[variant] || variants.ghost;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
    style: {
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
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-body-sm)",
      fontWeight: "var(--fw-semibold)",
      color: "var(--text-secondary)"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      height: 48,
      padding: "0 14px",
      background: disabled ? "var(--surface-sunken)" : "var(--surface-card)",
      border: `1.5px solid ${borderColor}`,
      borderRadius: "var(--radius-md)",
      boxShadow: focus ? `0 0 0 4px var(--focus-ring)` : "none",
      transition: "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)"
    }
  }, leftIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      color: "var(--text-tertiary)"
    }
  }, leftIcon), prefix && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-tertiary)",
      fontFamily: "var(--font-mono)",
      fontWeight: 500
    }
  }, prefix), /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
      fontSize: "var(--fs-body)",
      fontWeight: mono ? 600 : 400,
      color: "var(--text-primary)",
      ...inputStyle
    }
  }, rest)), suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-tertiary)",
      fontSize: "var(--fs-body-sm)"
    }
  }, suffix)), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-caption)",
      color: error ? "var(--danger)" : "var(--text-tertiary)"
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/ListRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Zeno ListRow — a single subscription line: brand tile, name + meta,
 * trailing amount/cadence and an optional chevron. The core building
 * block of the dashboard and lists.
 */
function ListRow({
  leading,
  title,
  subtitle,
  amount,
  cadence,
  trailing,
  chevron = false,
  onClick,
  divider = false,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const clickable = !!onClick;
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 14px",
      background: clickable && hover ? "var(--surface-sunken)" : "transparent",
      borderBottom: divider ? "1px solid var(--border-subtle)" : "none",
      borderRadius: "var(--radius-md)",
      cursor: clickable ? "pointer" : "default",
      transition: "background var(--dur-fast) var(--ease-out)",
      ...style
    }
  }, rest), leading && /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "none"
    }
  }, leading), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--fs-body)",
      fontWeight: "var(--fw-semibold)",
      color: "var(--text-primary)",
      letterSpacing: "var(--ls-snug)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--fs-body-sm)",
      color: "var(--text-tertiary)",
      marginTop: 1,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, subtitle)), trailing != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "none"
    }
  }, trailing) : amount != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--fs-body)",
      fontWeight: 700,
      color: "var(--text-primary)",
      letterSpacing: "var(--ls-snug)"
    }
  }, amount), cadence && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--fs-caption)",
      color: "var(--text-tertiary)"
    }
  }, "/", cadence)) : null, chevron && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 18,
    color: "var(--text-tertiary)"
  }));
}
Object.assign(__ds_scope, { ListRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/ListRow.jsx", error: String((e && e.message) || e) }); }

// components/core/ProgressBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Zeno ProgressBar — budget / usage meter. Auto-warns as it fills:
 * green under 75%, amber 75–99%, red at/over 100% (unless `color` is set).
 */
function ProgressBar({
  value = 0,
  max = 100,
  color,
  height = 8,
  showLabel = false,
  label,
  style,
  ...rest
}) {
  const pct = Math.max(0, Math.min(100, value / max * 100));
  const autoColor = pct >= 100 ? "var(--danger)" : pct >= 75 ? "var(--warning)" : "var(--accent)";
  const fill = color || autoColor;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      ...style
    }
  }, rest), showLabel && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: "var(--fs-caption)",
      color: "var(--text-secondary)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: "var(--fw-medium)"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600
    }
  }, Math.round(pct), "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height,
      background: "var(--surface-sunken)",
      borderRadius: "var(--radius-pill)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${pct}%`,
      height: "100%",
      background: fill,
      borderRadius: "var(--radius-pill)",
      transition: "width var(--dur-slow) var(--ease-out), background var(--dur) var(--ease-out)"
    }
  })));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/core/SegmentedControl.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Zeno SegmentedControl — iOS-style segmented tabs. Controlled.
 * options: array of { value, label } or strings.
 */
function SegmentedControl({
  options = [],
  value,
  onChange,
  size = "md",
  fullWidth = true,
  style,
  ...rest
}) {
  const opts = options.map(o => typeof o === "string" ? {
    value: o,
    label: o
  } : o);
  const h = size === "sm" ? 32 : 40;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: "inline-flex",
      width: fullWidth ? "100%" : "auto",
      padding: 3,
      gap: 2,
      background: "var(--surface-sunken)",
      borderRadius: "var(--radius-md)",
      ...style
    }
  }, rest), opts.map(o => {
    const selected = o.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: o.value,
      role: "tab",
      "aria-selected": selected,
      onClick: () => onChange && onChange(o.value),
      style: {
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
        transition: "background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)"
      }
    }, o.label);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/core/ServiceAvatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function ServiceAvatar({
  name = "",
  src,
  color,
  size = 44,
  shape = "rounded",
  style,
  ...rest
}) {
  const bg = color || pick(name);
  const radius = shape === "circle" ? "var(--radius-pill)" : "var(--radius-md)";
  const initial = (name.trim()[0] || "?").toUpperCase();
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
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
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : initial);
}
Object.assign(__ds_scope, { ServiceAvatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/ServiceAvatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Zeno Switch — iOS-style toggle. Green when on, gentle spring on the knob.
 */
function Switch({
  checked = false,
  onChange,
  disabled = false,
  size = "md",
  style,
  ...rest
}) {
  const dims = size === "sm" ? {
    w: 40,
    h: 24,
    k: 18
  } : {
    w: 50,
    h: 30,
    k: 24
  };
  const pad = (dims.h - dims.k) / 2;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "switch",
    "aria-checked": checked,
    disabled: disabled,
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
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
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: pad,
      left: checked ? dims.w - dims.k - pad : pad,
      width: dims.k,
      height: dims.k,
      borderRadius: "50%",
      background: "#fff",
      boxShadow: "0 1px 3px rgba(16,20,30,0.3)",
      transition: "left var(--dur) var(--ease-spring)"
    }
  }));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Switch.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AddSubscriptionScreen.jsx
try { (() => {
/* Zeno — Add subscription (CHANGE 5: renewal date is user-editable) */
function AddSubscriptionScreen({
  onClose
}) {
  const popular = [{
    name: "Netflix",
    color: "#E50914"
  }, {
    name: "Spotify",
    color: "#1DB954"
  }, {
    name: "YouTube",
    color: "#FF0000"
  }, {
    name: "Disney+",
    color: "#113CCF"
  }, {
    name: "ChatGPT",
    color: "#10A37F"
  }, {
    name: "Notion",
    color: "#111111"
  }, {
    name: "iCloud+",
    color: "#3B82F6"
  }, {
    name: "Figma",
    color: "#A259FF"
  }];
  const cats = [["Entertainment", "violet"], ["Music", "coral"], ["Productivity", "blue"], ["Shopping", "pink"], ["Utilities", "amber"], ["Health", "teal"]];
  const [picked, setPicked] = React.useState("Netflix");
  const [cat, setCat] = React.useState("Entertainment");
  const [cadence, setCadence] = React.useState("Monthly");
  const [remind, setRemind] = React.useState(true);
  const [days, setDays] = React.useState(14); // days until next renewal — editable

  const renewalLabel = () => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  };
  return /*#__PURE__*/React.createElement(Sheet, {
    title: "Add subscription",
    onClose: onClose,
    footer: /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: onClose
    }, "Add subscription")
  }, /*#__PURE__*/React.createElement(Label, null, "Popular"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 10,
      marginBottom: 18
    }
  }, popular.map(p => {
    const on = picked === p.name;
    return /*#__PURE__*/React.createElement("button", {
      key: p.name,
      onClick: () => setPicked(p.name),
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        padding: "10px 4px",
        background: "var(--surface-card)",
        border: `1.5px solid ${on ? "var(--accent)" : "var(--border-subtle)"}`,
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        boxShadow: on ? "0 0 0 3px var(--focus-ring)" : "none"
      }
    }, /*#__PURE__*/React.createElement(ServiceAvatar, {
      name: p.name,
      color: p.color,
      size: 36
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        fontWeight: 500,
        color: "var(--text-secondary)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: "100%"
      }
    }, p.name));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Name",
    value: picked,
    onChange: e => setPicked(e.target.value)
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Cost",
    prefix: "$",
    mono: true,
    placeholder: "0.00",
    suffix: `/ ${cadence === "Monthly" ? "mo" : "yr"}`
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "Billing cycle"), /*#__PURE__*/React.createElement(SegmentedControl, {
    options: ["Monthly", "Yearly"],
    value: cadence,
    onChange: setCadence
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "Next renews"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: "var(--surface-card)",
      border: "1.5px solid var(--border-default)",
      borderRadius: "var(--radius-md)",
      padding: "10px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      flex: "none",
      borderRadius: "var(--radius-sm)",
      background: "var(--accent-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "calendar",
    size: 19,
    color: "var(--accent-text)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 650,
      fontSize: 15,
      color: "var(--text-primary)"
    }
  }, renewalLabel()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      color: "var(--text-tertiary)"
    }
  }, "in ", days, " day", days === 1 ? "" : "s")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    variant: "secondary",
    size: 34,
    label: "Earlier",
    onClick: () => setDays(d => Math.max(0, d - 1))
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "minus",
    size: 16
  })), /*#__PURE__*/React.createElement(IconButton, {
    variant: "secondary",
    size: 34,
    label: "Later",
    onClick: () => setDays(d => d + 1)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginTop: 8
    }
  }, [["Tomorrow", 1], ["In a week", 7], ["In 2 weeks", 14], ["In a month", 30]].map(([lbl, d]) => /*#__PURE__*/React.createElement("button", {
    key: lbl,
    onClick: () => setDays(d),
    style: {
      flex: 1,
      height: 30,
      borderRadius: "var(--radius-pill)",
      border: `1px solid ${days === d ? "transparent" : "var(--border-default)"}`,
      background: days === d ? "var(--ink-900)" : "transparent",
      color: days === d ? "#fff" : "var(--text-secondary)",
      fontFamily: "var(--font-sans)",
      fontSize: 11.5,
      fontWeight: 600,
      cursor: "pointer",
      whiteSpace: "nowrap"
    }
  }, lbl)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "Category"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8
    }
  }, cats.map(([name, c]) => {
    const on = cat === name;
    return /*#__PURE__*/React.createElement("button", {
      key: name,
      onClick: () => setCat(name),
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        height: 34,
        padding: "0 12px",
        borderRadius: "var(--radius-pill)",
        border: `1.5px solid ${on ? `var(--cat-${c})` : "var(--border-default)"}`,
        background: on ? "var(--surface-card)" : "transparent",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: `var(--cat-${c})`
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: on ? 600 : 500,
        color: on ? "var(--text-primary)" : "var(--text-secondary)"
      }
    }, name));
  }))), /*#__PURE__*/React.createElement(Card, {
    padding: "md"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      color: "var(--text-primary)"
    }
  }, "Remind me before renewal"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-tertiary)",
      marginTop: 1
    }
  }, "7 and 3 days ahead")), /*#__PURE__*/React.createElement(Switch, {
    checked: remind,
    onChange: setRemind
  })))));
}
function Label({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: "var(--text-tertiary)",
      margin: "0 0 8px 2px"
    }
  }, children);
}
window.AddSubscriptionScreen = AddSubscriptionScreen;
window.Label = Label;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AddSubscriptionScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/BudgetRecapScreen.jsx
try { (() => {
/* Zeno — End-of-month budget recap. Connects budget adherence to history / Wrapped. */
function BudgetRecapScreen({
  onClose
}) {
  const B = window.ZENO.budget;
  const r = B.recap;
  const under = r.actual <= r.cap;
  const diff = Math.abs(r.cap - r.actual);
  const max = Math.max(...B.trend.map(t => t[1]), r.cap);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background: "var(--surface-sunken)"
    }
  }, /*#__PURE__*/React.createElement(ScreenHeader, {
    title: `${r.month} recap`,
    right: /*#__PURE__*/React.createElement(IconButton, {
      label: "Close",
      onClick: onClose
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 22
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "4px 16px 20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: under ? "var(--accent)" : "var(--ink-900)",
      borderRadius: "var(--radius-2xl)",
      padding: "26px 22px",
      textAlign: "center",
      color: under ? "var(--ink-900)" : "#fff",
      boxShadow: under ? "var(--shadow-accent)" : "var(--shadow-lg)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      borderRadius: "50%",
      background: under ? "rgba(10,42,28,0.18)" : "var(--danger-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 14px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: under ? "party-popper" : "triangle-alert",
    size: 28,
    color: under ? "var(--ink-900)" : "var(--danger)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 24,
      letterSpacing: "-0.02em"
    }
  }, under ? "You stayed under!" : "You went over"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 14.5,
      marginTop: 6,
      opacity: 0.85
    }
  }, under ? `$${diff.toFixed(2)} under your $${r.cap} cap in ${r.month}.` : `$${diff.toFixed(2)} over your $${r.cap} cap in ${r.month}.`), under && r.streak > 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      marginTop: 14,
      padding: "5px 12px",
      borderRadius: "var(--radius-pill)",
      background: "rgba(10,42,28,0.16)",
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "flame",
    size: 14,
    color: "var(--ink-900)"
  }), " ", r.streak, "-month streak")), /*#__PURE__*/React.createElement(Card, {
    padding: "md",
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Budget",
    value: `$${r.cap.toFixed(0)}`
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Actual",
    value: `$${r.actual.toFixed(2)}`,
    accent: under
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "vs Apr",
    value: `${r.actual < r.prevActual ? "−" : "+"}$${Math.abs(r.actual - r.prevActual).toFixed(2)}`
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "flex-end",
      gap: 8,
      height: 90,
      marginTop: 8,
      paddingTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      top: `${6 + (1 - r.cap / max) * 84}px`,
      borderTop: "1.5px dashed var(--border-strong)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      right: 0,
      top: -8,
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      color: "var(--text-tertiary)",
      background: "var(--surface-card)",
      padding: "0 3px"
    }
  }, "cap")), B.trend.map(([m, v], i) => {
    const last = i === B.trend.length - 1;
    return /*#__PURE__*/React.createElement("div", {
      key: m,
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        zIndex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        maxWidth: 26,
        height: `${v / max * 84}px`,
        background: v > r.cap ? "var(--danger)" : last ? "var(--accent)" : "var(--accent-soft-2)",
        borderRadius: "var(--radius-sm)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 10.5,
        color: "var(--text-tertiary)"
      }
    }, m));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginTop: 14,
      padding: "12px 14px",
      background: "var(--accent-soft)",
      borderRadius: "var(--radius-md)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "gift",
    size: 17,
    color: "var(--accent-text)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      color: "var(--text-secondary)"
    }
  }, "Budget adherence rolls into your Year in Review."), /*#__PURE__*/React.createElement(Badge, {
    tone: "pro",
    style: {
      background: "#e9e9f2",
      color: "#43417a"
    }
  }, "Pro"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      padding: "12px 16px 28px",
      borderTop: "1px solid var(--border-subtle)",
      background: "var(--surface-card)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: onClose
  }, "Done")));
}
function Stat({
  label,
  value,
  accent
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: 17,
      color: accent ? "var(--accent-text)" : "var(--text-primary)"
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 11,
      color: "var(--text-tertiary)",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      marginTop: 2
    }
  }, label));
}
window.BudgetRecapScreen = BudgetRecapScreen;
window.Stat = Stat;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/BudgetRecapScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/BudgetScreen.jsx
try { (() => {
/* Zeno — Budget (subscription-first, forecast-led). Reached from Home status card
   and the Insights tab. Forward-looking status compares PROJECTED to the cap. */
function BudgetScreen({
  onBack,
  onCancelSub,
  onUpgrade,
  onImport,
  onRecap
}) {
  const B = window.ZENO.budget;
  // demo: lets you walk every state. 'none' = not set yet.
  const [cap, setCap] = React.useState(B.cap); // null when none
  const [setupCap, setSetupCap] = React.useState(80);
  const [income, setIncome] = React.useState(B.income);
  const [incomeInput, setIncomeInput] = React.useState("");
  const [envs, setEnvs] = React.useState(B.envelopes);
  const committed = B.committed;
  const projected = B.projected;

  // ----- NO BUDGET SET (invite + zero-data setup) -----
  if (cap == null) {
    const suggested = Math.ceil(projected / 5) * 5; // round committed forecast up to nearest $5
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement(ScreenHeader, {
      title: "Budget",
      left: /*#__PURE__*/React.createElement(IconButton, {
        label: "Back",
        onClick: onBack
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "chevron-left",
        size: 24
      }))
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        padding: "4px 20px 20px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 52,
        height: 52,
        borderRadius: "var(--radius-lg)",
        background: "var(--accent-soft)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "target",
      size: 26,
      color: "var(--accent-text)"
    })), /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 25,
        letterSpacing: "-0.02em",
        margin: "0 0 8px",
        textWrap: "balance"
      }
    }, "Set a recurring budget"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 14.5,
        color: "var(--text-secondary)",
        lineHeight: 1.5,
        margin: "0 0 6px"
      }
    }, "No bank link needed. Zeno already knows your subscriptions and when they renew, so we can forecast your month from day one."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-sans)",
        fontSize: 12.5,
        color: "var(--text-tertiary)",
        marginBottom: 20
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "zap",
      size: 14,
      color: "var(--accent-text)"
    }), " Based on your renewals \u2014 no import required."), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--ink-900)",
        borderRadius: "var(--radius-xl)",
        padding: "18px 20px",
        marginBottom: 18
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12.5,
        color: "var(--ink-300)",
        textTransform: "uppercase",
        letterSpacing: "0.06em"
      }
    }, "Forecast this month"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement(AmountDisplay, {
      amount: projected,
      size: "lg",
      color: "#fff"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12.5,
        color: "var(--ink-400)",
        marginTop: 4
      }
    }, "$", committed.toFixed(2), " charged \xB7 $", (projected - committed).toFixed(2), " still to renew")), /*#__PURE__*/React.createElement(Label, null, "Your monthly cap"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        margin: "4px 0 14px"
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      variant: "secondary",
      size: 44,
      label: "Lower",
      onClick: () => setSetupCap(c => Math.max(5, c - 5))
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "minus",
      size: 20
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 120,
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement(AmountDisplay, {
      amount: setupCap,
      size: "lg"
    })), /*#__PURE__*/React.createElement(IconButton, {
      variant: "secondary",
      size: 44,
      label: "Raise",
      onClick: () => setSetupCap(c => c + 5)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 20
    }))), /*#__PURE__*/React.createElement("button", {
      onClick: () => setSetupCap(suggested),
      style: {
        display: "block",
        margin: "0 auto 4px",
        background: "none",
        border: "none",
        color: "var(--accent-text)",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer"
      }
    }, "Use suggested \xB7 $", suggested), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        color: "var(--text-tertiary)",
        textAlign: "center",
        margin: "0 0 4px"
      }
    }, setupCap < projected ? `That's below your $${projected.toFixed(0)} forecast — we'll warn you early.` : `$${(setupCap - projected).toFixed(0)} of headroom above your forecast.`)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: "none",
        padding: "12px 16px 28px",
        borderTop: "1px solid var(--border-subtle)",
        background: "var(--surface-card)"
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: () => setCap(setupCap)
    }, "Start tracking this budget")));
  }

  // ----- BUDGET SET -----
  const pct = Math.min(100, projected / cap * 100);
  const committedPct = Math.min(100, committed / cap * 100);
  const over = projected > cap;
  const approaching = !over && projected > 0.85 * cap;
  const status = over ? "over" : approaching ? "approaching" : "under";
  const headroom = cap - projected;
  const statusMeta = {
    under: ["success", "circle-check", "On pace", `Forecast $${projected.toFixed(2)} — $${headroom.toFixed(2)} under your $${cap} cap.`],
    approaching: ["warning", "trending-up", "Approaching", `On pace for $${projected.toFixed(2)} — within $${headroom.toFixed(2)} of your $${cap} cap.`],
    over: ["danger", "triangle-alert", "Over budget", `Forecast $${projected.toFixed(2)} — $${Math.abs(headroom).toFixed(2)} over your $${cap} cap.`]
  }[status];
  const sc = {
    success: ["var(--success-soft)", "var(--success)"],
    warning: ["var(--warning-soft)", "#B45309"],
    danger: ["var(--danger-soft)", "var(--danger)"]
  }[statusMeta[0]];

  // get-back-under candidates: unused first, then cheapest active subs
  const candidates = window.ZENO.subscriptions.filter(s => s.status === "active").sort((a, b) => (b.unused ? 1 : 0) - (a.unused ? 1 : 0) || a.amount - b.amount).slice(0, 3);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      overflowX: "hidden",
      paddingBottom: 24
    }
  }, /*#__PURE__*/React.createElement(ScreenHeader, {
    title: "Budget",
    left: /*#__PURE__*/React.createElement(IconButton, {
      label: "Back",
      onClick: onBack
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-left",
      size: 24
    })),
    right: /*#__PURE__*/React.createElement(IconButton, {
      label: "Edit budget",
      onClick: () => setCap(null)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "pencil",
      size: 20
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--ink-900)",
      borderRadius: "var(--radius-2xl)",
      padding: "22px",
      boxShadow: "var(--shadow-lg)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      fontWeight: 600,
      color: "var(--ink-300)",
      textTransform: "uppercase",
      letterSpacing: "0.06em"
    }
  }, "Projected this month"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      flex: "none",
      whiteSpace: "nowrap",
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      fontWeight: 700,
      padding: "3px 9px",
      borderRadius: "var(--radius-pill)",
      background: sc[0],
      color: sc[1]
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: statusMeta[1],
    size: 13,
    color: sc[1]
  }), " ", statusMeta[2])), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 8,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(AmountDisplay, {
    amount: projected,
    size: "xl",
    color: "#fff"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 15,
      color: "var(--ink-400)"
    }
  }, "/ $", cap)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: 8,
      background: "rgba(255,255,255,0.12)",
      borderRadius: 4,
      marginTop: 16,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      width: `${pct}%`,
      background: over ? "var(--danger)" : approaching ? "var(--warning)" : "var(--green-400)",
      borderRadius: 4
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 0,
      bottom: 0,
      width: `${committedPct}%`,
      background: "rgba(255,255,255,0.5)",
      borderRadius: 4
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 8,
      fontFamily: "var(--font-sans)",
      fontSize: 11.5,
      color: "var(--ink-400)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "$", committed.toFixed(2), " charged"), /*#__PURE__*/React.createElement("span", null, B.daysLeftInMonth, " days left")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginTop: 12,
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      color: "var(--ink-300)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    size: 13,
    color: "var(--ink-400)"
  }), " Forecast from your renewal dates")), (over || approaching) && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      border: `1px solid ${sc[1]}`,
      borderRadius: "var(--radius-lg)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: sc[0],
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "scissors",
    size: 18,
    color: sc[1]
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 700,
      fontSize: 14,
      color: "var(--text-primary)"
    }
  }, over ? `Cut $${Math.abs(headroom).toFixed(2)} to get back under` : "Trim now to stay under")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)"
    }
  }, candidates.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "11px 14px",
      borderTop: i ? "1px solid var(--border-subtle)" : "none"
    }
  }, /*#__PURE__*/React.createElement(ServiceAvatar, {
    name: s.name,
    color: s.color,
    size: 34
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 650,
      fontSize: 14,
      color: "var(--text-primary)"
    }
  }, s.name), s.unused && /*#__PURE__*/React.createElement(Badge, {
    tone: "warning"
  }, "Unused 60d")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--text-tertiary)"
    }
  }, "$", s.amount.toFixed(2), "/mo \xB7 $", (s.amount * 12).toFixed(0), "/yr")), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: () => onCancelSub(s.id)
  }, "Cancel"))))), /*#__PURE__*/React.createElement("button", {
    onClick: onUpgrade,
    style: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 12,
      textAlign: "left",
      marginTop: 14,
      background: "var(--accent-soft)",
      border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
      borderRadius: "var(--radius-lg)",
      padding: "13px 15px",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 20,
    color: "var(--accent-text)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 650,
      fontSize: 13.5,
      color: "var(--text-primary)"
    }
  }, "Ask the Spend Coach"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      color: "var(--text-secondary)"
    }
  }, "\u201CTo hit $", cap, ", cancel Figma + Disney+ \u2192 save $26/mo\u201D")), /*#__PURE__*/React.createElement(Badge, {
    tone: "pro",
    style: {
      background: "#e9e9f2",
      color: "#43417a"
    }
  }, "Pro")), /*#__PURE__*/React.createElement(SectionLabel, {
    icon: "calendar-clock"
  }, "Forecast \xB7 still to renew"), /*#__PURE__*/React.createElement(Card, {
    padding: "none"
  }, B.remaining.map((r, i) => {
    const run = committed + B.remaining.slice(0, i + 1).reduce((a, x) => a + x.amount, 0);
    return /*#__PURE__*/React.createElement(ListRow, {
      key: r.id,
      divider: i < B.remaining.length - 1,
      leading: /*#__PURE__*/React.createElement(ServiceAvatar, {
        name: r.name,
        color: r.color,
        size: 36
      }),
      title: r.name,
      subtitle: `${r.day}${r.note ? " · " + r.note : ""}`,
      trailing: /*#__PURE__*/React.createElement("div", {
        style: {
          textAlign: "right"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          fontWeight: 700,
          color: "var(--text-primary)"
        }
      }, "+$", r.amount.toFixed(2)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text-tertiary)"
        }
      }, "\u2192 $", run.toFixed(2)))
    });
  })), /*#__PURE__*/React.createElement(SectionLabel, {
    icon: "chart-pie",
    pro: true
  }, "Category budgets"), /*#__PURE__*/React.createElement(Card, {
    padding: "md"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, B.categoryCaps.map(c => {
    const total = c.committed + c.imported;
    const cpct = Math.min(100, total / c.cap * 100);
    const cover = total > c.cap;
    return /*#__PURE__*/React.createElement("div", {
      key: c.category
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        fontWeight: 600,
        color: "var(--text-primary)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 9,
        height: 9,
        borderRadius: "50%",
        background: `var(--cat-${c.cat})`
      }
    }), c.category), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        color: cover ? "var(--danger)" : "var(--text-tertiary)"
      }
    }, /*#__PURE__*/React.createElement("b", {
      style: {
        color: "var(--text-primary)"
      }
    }, "$", total.toFixed(2)), " / $", c.cap)), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 7,
        background: "var(--surface-sunken)",
        borderRadius: 4,
        overflow: "hidden",
        display: "flex"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: `${Math.min(100, c.committed / c.cap * 100)}%`,
        background: cover ? "var(--danger)" : `var(--cat-${c.cat})`
      }
    }), c.imported > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        width: `${c.imported / c.cap * 100}%`,
        background: cover ? "var(--danger)" : `var(--cat-${c.cat})`,
        opacity: 0.45
      }
    })), c.imported > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        color: "var(--text-tertiary)",
        marginTop: 4
      }
    }, "$", c.committed.toFixed(2), " subs + $", c.imported.toFixed(2), " imported"));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginTop: 14,
      padding: "10px 12px",
      background: "var(--surface-sunken)",
      borderRadius: "var(--radius-md)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 15,
    color: "var(--text-tertiary)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      color: "var(--text-tertiary)"
    }
  }, "Imported spend as of ", B.lastImport, " \xB7 39 days ago"), /*#__PURE__*/React.createElement("button", {
    onClick: onImport,
    style: {
      background: "none",
      border: "none",
      color: "var(--accent-text)",
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, "Refresh"))), /*#__PURE__*/React.createElement(SectionLabel, {
    icon: "wallet",
    pro: true
  }, "Manual envelopes"), /*#__PURE__*/React.createElement(Card, {
    padding: "none"
  }, envs.map((e, i) => {
    const epct = Math.min(100, e.spent / e.funded * 100);
    const eover = e.spent > e.funded;
    return /*#__PURE__*/React.createElement("div", {
      key: e.id,
      style: {
        padding: "12px 14px",
        borderTop: i ? "1px solid var(--border-subtle)" : "none"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 11
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 34,
        height: 34,
        flex: "none",
        borderRadius: "var(--radius-md)",
        background: "var(--surface-sunken)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: e.icon,
      size: 17,
      color: "var(--text-secondary)"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontWeight: 650,
        fontSize: 14,
        color: "var(--text-primary)"
      }
    }, e.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: eover ? "var(--danger)" : "var(--text-tertiary)"
      }
    }, "$", e.spent.toFixed(2), " of $", e.funded.toFixed(2), eover ? " · over" : "")), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      onClick: () => setEnvs(es => es.map(x => x.id === e.id ? {
        ...x,
        spent: +(x.spent + 5).toFixed(2)
      } : x)),
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "plus",
        size: 15
      })
    }, "Log $5")), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 6,
        background: "var(--surface-sunken)",
        borderRadius: 3,
        overflow: "hidden",
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: `${epct}%`,
        height: "100%",
        background: eover ? "var(--danger)" : "var(--accent)",
        borderRadius: 3,
        transition: "width var(--dur) var(--ease-out)"
      }
    })));
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setEnvs(es => [...es, {
      id: "env" + es.length,
      name: "New envelope",
      icon: "wallet",
      funded: 100,
      spent: 0
    }]),
    style: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: "13px",
      background: "none",
      border: "none",
      borderTop: "1px solid var(--border-subtle)",
      color: "var(--accent-text)",
      fontFamily: "var(--font-sans)",
      fontSize: 13.5,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16,
    color: "var(--accent-text)"
  }), " Add envelope")), /*#__PURE__*/React.createElement(SectionLabel, {
    icon: "banknote"
  }, "Income context"), income == null ? /*#__PURE__*/React.createElement(Card, {
    padding: "md"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13.5,
      color: "var(--text-secondary)",
      marginBottom: 10,
      lineHeight: 1.45
    }
  }, "Optional \u2014 add monthly income to see what % goes to subscriptions. Budgeting works fine without it."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Input, {
    prefix: "$",
    mono: true,
    placeholder: "4,200",
    value: incomeInput,
    onChange: e => setIncomeInput(e.target.value.replace(/[^0-9]/g, "")),
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    onClick: () => setIncome(Number(incomeInput) || 4200)
  }, "Add"))) : /*#__PURE__*/React.createElement(Card, {
    padding: "md"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 22,
      color: "var(--text-primary)"
    }
  }, Math.round(projected / income * 100), "%"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      color: "var(--text-tertiary)"
    }
  }, "of $", income.toLocaleString(), " income goes to subscriptions")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: 16,
      color: "var(--text-primary)"
    }
  }, "$", (income - projected).toLocaleString()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      color: "var(--text-tertiary)"
    }
  }, "left after recurring")))), /*#__PURE__*/React.createElement("button", {
    onClick: onRecap,
    style: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 12,
      textAlign: "left",
      marginTop: 16,
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      padding: "14px 16px",
      cursor: "pointer",
      boxShadow: "var(--shadow-xs)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "history",
    size: 20,
    color: "var(--text-secondary)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 650,
      fontSize: 14,
      color: "var(--text-primary)"
    }
  }, "Last month's recap"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      color: "var(--text-tertiary)"
    }
  }, B.recap.month, ": stayed under by $", (B.recap.cap - B.recap.actual).toFixed(2))), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 18,
    color: "var(--text-tertiary)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22,
      padding: "12px 14px",
      border: "1px dashed var(--border-default)",
      borderRadius: "var(--radius-md)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "var(--text-tertiary)",
      marginBottom: 8
    }
  }, "Demo \xB7 preview budget states"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: () => setCap(110),
    style: {
      flex: 1
    }
  }, "On pace"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: () => setCap(80),
    style: {
      flex: 1
    }
  }, "Approaching"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: () => setCap(65),
    style: {
      flex: 1
    }
  }, "Over"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: () => setCap(null),
    style: {
      flex: 1
    }
  }, "Unset")))));
}
function SectionLabel({
  icon,
  pro,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "22px 4px 10px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 17,
    color: "var(--text-secondary)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 16,
      color: "var(--text-primary)"
    }
  }, children), pro && /*#__PURE__*/React.createElement(Badge, {
    tone: "pro",
    style: {
      background: "#e9e9f2",
      color: "#43417a"
    }
  }, "Pro"));
}
window.BudgetScreen = BudgetScreen;
window.SectionLabel = SectionLabel;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/BudgetScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/CalendarScreen.jsx
try { (() => {
/* Zeno — Calendar of upcoming renewals (calendar tab) */
function CalendarScreen({
  onOpen
}) {
  const subs = window.ZENO.subscriptions.filter(s => ["active", "trial"].includes(s.status));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      overflowX: "hidden",
      paddingBottom: 24
    }
  }, /*#__PURE__*/React.createElement(ScreenHeader, {
    large: true,
    title: "Calendar",
    right: /*#__PURE__*/React.createElement(IconButton, {
      label: "Filter"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "sliders-horizontal"
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "4px 16px 0"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "md",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 46,
      height: 46,
      borderRadius: "var(--radius-md)",
      background: "var(--accent-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "calendar-clock",
    size: 22,
    color: "var(--accent-text)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: 15,
      color: "var(--text-primary)"
    }
  }, "Next 30 days"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      color: "var(--text-tertiary)"
    }
  }, subs.length, " renewals \xB7 $", subs.reduce((a, s) => a + s.amount, 0).toFixed(2))))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 17,
      color: "var(--text-primary)",
      padding: "22px 20px 8px"
    }
  }, "July 2026"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 16px",
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, subs.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    onClick: () => onOpen(s.id),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      padding: "10px 12px",
      boxShadow: "var(--shadow-xs)",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      flex: "none",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: 18,
      color: "var(--text-primary)",
      lineHeight: 1
    }
  }, s.next.split(" ")[1]), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 11,
      fontWeight: 600,
      color: "var(--text-tertiary)",
      textTransform: "uppercase"
    }
  }, s.next.split(" ")[0])), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 32,
      background: "var(--border-subtle)",
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement(ServiceAvatar, {
    name: s.name,
    color: s.color,
    size: 36
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: 14.5,
      color: "var(--text-primary)"
    }
  }, s.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      color: "var(--text-tertiary)"
    }
  }, s.category)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: 14.5,
      color: "var(--text-primary)"
    }
  }, "$", s.amount.toFixed(2))))));
}
window.CalendarScreen = CalendarScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/CalendarScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/CancelFlowScreen.jsx
try { (() => {
/* Zeno — Cancel + verification flow (CHANGE 4)
   Guided → Pending verification → Verified cancelled OR Still being charged.
   A demo control on the pending step lets you see both resolutions. */
function CancelFlowScreen({
  id,
  onClose,
  onDone
}) {
  const s = window.ZENO.subscriptions.find(x => x.id === id) || window.ZENO.subscriptions[0];
  const yearly = (s.amount * 12).toFixed(2);
  const [stage, setStage] = React.useState("guided"); // guided | pending | verified | charged

  // Difficulty varies by service (demo): Adobe hard, others medium/easy
  const difficulty = s.id === "adobe" ? ["Hard", 3, "var(--danger)"] : s.id === "hbo" ? ["Medium", 2, "var(--warning)"] : ["Easy", 1, "var(--success)"];
  const steps = [`Sign in to ${s.name} in a browser`, "Open Account → Subscription or Plan", "Choose Cancel and confirm", "Keep the confirmation email"];
  if (stage === "guided") {
    return /*#__PURE__*/React.createElement(Sheet, {
      title: `Cancel ${s.name}`,
      onClose: onClose,
      footer: /*#__PURE__*/React.createElement(Button, {
        variant: "primary",
        size: "lg",
        fullWidth: true,
        onClick: () => setStage("pending")
      }, "I cancelled it")
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "14px 16px",
        marginBottom: 14,
        boxShadow: "var(--shadow-xs)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "var(--text-tertiary)"
      }
    }, "Cancellation difficulty"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 20,
        color: difficulty[2],
        marginTop: 2
      }
    }, difficulty[0])), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 4
      }
    }, [1, 2, 3].map(n => /*#__PURE__*/React.createElement("span", {
      key: n,
      style: {
        width: 10,
        height: 24,
        borderRadius: 3,
        background: n <= difficulty[1] ? difficulty[2] : "var(--surface-sunken)"
      }
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "var(--text-tertiary)",
        margin: "4px 2px 10px"
      }
    }, "Step by step"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 2
      }
    }, steps.map((st, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "8px 0"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 24,
        height: 24,
        flex: "none",
        borderRadius: "50%",
        background: "var(--ink-900)",
        color: "#fff",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, i + 1), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        color: "var(--text-secondary)",
        paddingTop: 2
      }
    }, st)))), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "lg",
      fullWidth: true,
      onClick: () => {},
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "external-link",
        size: 18
      }),
      style: {
        marginTop: 16
      }
    }, "Open ", s.name, " cancellation page"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        marginTop: 16,
        fontFamily: "var(--font-sans)",
        fontSize: 12.5,
        color: "var(--text-tertiary)",
        lineHeight: 1.45
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "info",
      size: 15,
      color: "var(--text-tertiary)",
      style: {
        marginTop: 1
      }
    }), /*#__PURE__*/React.createElement("span", null, "We'll never mark this cancelled until we've confirmed the charge actually stopped.")));
  }
  if (stage === "pending") {
    return /*#__PURE__*/React.createElement(Sheet, {
      title: "Pending verification",
      onClose: onDone
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "30px 14px 10px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 64,
        height: 64,
        borderRadius: "50%",
        background: "var(--info-soft)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "clock",
      size: 30,
      color: "var(--info)"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 21,
        color: "var(--text-primary)"
      }
    }, "We're verifying it stopped"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        color: "var(--text-secondary)",
        lineHeight: 1.5,
        margin: "8px 0 0",
        maxWidth: "32ch"
      }
    }, s.name, " is marked ", /*#__PURE__*/React.createElement("b", null, "pending verification"), ". Zeno will re-check your next receipt and statement around ", s.next, ". We won't call it cancelled until we're sure.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "14px 16px",
        margin: "20px 0",
        boxShadow: "var(--shadow-xs)"
      }
    }, [["Cancellation reported", true], ["Re-check next receipt", false], ["Confirm no charge", false]].map(([t, done]) => /*#__PURE__*/React.createElement("div", {
      key: t,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: done ? "check-circle" : "circle",
      size: 18,
      color: done ? "var(--success)" : "var(--border-strong)"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 13.5,
        color: done ? "var(--text-primary)" : "var(--text-tertiary)",
        fontWeight: done ? 600 : 400
      }
    }, t)))), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: onDone
    }, "Got it"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 22,
        padding: "12px 14px",
        border: "1px dashed var(--border-default)",
        borderRadius: "var(--radius-md)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--text-tertiary)",
        marginBottom: 8
      }
    }, "Demo \xB7 preview the outcome"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      onClick: () => setStage("verified"),
      style: {
        flex: 1
      }
    }, "\u2713 No charge"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      onClick: () => setStage("charged"),
      style: {
        flex: 1
      }
    }, "\u2715 Charged again"))));
  }
  if (stage === "verified") {
    return /*#__PURE__*/React.createElement(Sheet, {
      title: "",
      onClose: onDone
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "40px 18px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 76,
        height: 76,
        borderRadius: "50%",
        background: "var(--accent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
        boxShadow: "var(--shadow-accent)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 38,
      color: "var(--text-on-accent)",
      strokeWidth: 3
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 24,
        color: "var(--text-primary)"
      }
    }, "Verified cancelled"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 14.5,
        color: "var(--text-secondary)",
        lineHeight: 1.5,
        margin: "8px 0 22px",
        maxWidth: "30ch"
      }
    }, "No charge from ", s.name, " on your latest statement. It's confirmed \u2014 and you're saving:"), /*#__PURE__*/React.createElement(AmountDisplay, {
      amount: Number(yearly),
      cadence: "yr",
      size: "lg",
      color: "var(--accent-text)"
    })), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: onDone
    }, "Done"));
  }

  // charged
  return /*#__PURE__*/React.createElement(Sheet, {
    title: "",
    onClose: onDone
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      padding: "40px 18px 18px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 76,
      height: 76,
      borderRadius: "50%",
      background: "var(--danger-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "triangle-alert",
    size: 36,
    color: "var(--danger)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 23,
      color: "var(--text-primary)"
    }
  }, "Still being charged"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 14.5,
      color: "var(--text-secondary)",
      lineHeight: 1.5,
      margin: "8px 0 22px",
      maxWidth: "32ch"
    }
  }, "We spotted another ", s.name, " charge of ", /*#__PURE__*/React.createElement("b", null, "$", s.amount.toFixed(2)), " after you cancelled. The cancellation didn't go through \u2014 let's try again.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: () => setStage("guided"),
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "rotate-ccw",
      size: 18
    })
  }, "Try cancelling again"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    fullWidth: true,
    onClick: onDone,
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "life-buoy",
      size: 18
    })
  }, "Get escalation help")));
}
window.CancelFlowScreen = CancelFlowScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/CancelFlowScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Chrome.jsx
try { (() => {
/* Shared iOS chrome for the Zeno app: StatusBar, TabBar, ScreenHeader. */

function StatusBar({
  dark = false
}) {
  const color = dark ? "#fff" : "var(--ink-900)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 28px 0 32px",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 700,
      fontSize: 15,
      color,
      letterSpacing: "-0.01em"
    }
  }, "9:41"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 7,
      color
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "signal",
    size: 17,
    color: color
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "wifi",
    size: 17,
    color: color
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "battery-full",
    size: 20,
    color: color
  })));
}
function ScreenHeader({
  title,
  left,
  right,
  large = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      padding: large ? "6px 20px 8px" : "4px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      minWidth: 44
    }
  }, left), !large && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 700,
      fontSize: 17,
      color: "var(--text-primary)",
      whiteSpace: "nowrap"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 4,
      minWidth: 44
    }
  }, right)), large && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 30,
      letterSpacing: "-0.02em",
      color: "var(--text-primary)",
      padding: "0 8px"
    }
  }, title));
}
const TABS = [{
  id: "home",
  icon: "house",
  label: "Home"
}, {
  id: "subs",
  icon: "layers",
  label: "Subs"
}, {
  id: "discover",
  icon: "plus",
  label: ""
}, {
  id: "calendar",
  icon: "calendar",
  label: "Calendar"
}, {
  id: "insights",
  icon: "chart-pie",
  label: "Insights"
}];
function TabBar({
  active,
  onTab
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      height: 84,
      borderTop: "1px solid var(--border-subtle)",
      background: "color-mix(in srgb, var(--surface-card) 88%, transparent)",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "flex-start",
      paddingTop: 10
    }
  }, TABS.map(t => {
    if (t.id === "discover") {
      return /*#__PURE__*/React.createElement("div", {
        key: t.id,
        style: {
          flex: 1,
          display: "flex",
          justifyContent: "center"
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => onTab("discover"),
        "aria-label": "Discover subscriptions",
        style: {
          width: 52,
          height: 52,
          marginTop: -6,
          borderRadius: "var(--radius-pill)",
          border: "none",
          background: "var(--accent)",
          color: "var(--text-on-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-accent)",
          cursor: "pointer"
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "plus",
        size: 26,
        color: "var(--text-on-accent)"
      })));
    }
    const on = active === t.id;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => onTab(t.id),
      style: {
        flex: 1,
        background: "none",
        border: "none",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        color: on ? "var(--accent-text)" : "var(--text-tertiary)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: t.icon,
      size: 23,
      color: on ? "var(--accent-text)" : "var(--text-tertiary)",
      strokeWidth: on ? 2.4 : 2
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 10,
        fontWeight: on ? 700 : 500
      }
    }, t.label));
  }));
}
window.StatusBar = StatusBar;
window.ScreenHeader = ScreenHeader;
window.TabBar = TabBar;

/* Shared status pill — maps a subscription status to a Badge. */
function StatusPill({
  status
}) {
  const map = {
    active: ["success", "Active", true],
    trial: ["warning", "Free trial", true],
    paused: ["neutral", "Paused", true],
    pending: ["info", "Pending verification", false],
    cancelled: ["neutral", "Verified cancelled", false],
    attention: ["danger", "Still charging", false]
  };
  const [tone, label, dot] = map[status] || map.active;
  return /*#__PURE__*/React.createElement(Badge, {
    tone: tone,
    dot: dot
  }, label);
}
window.StatusPill = StatusPill;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Chrome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/DiscoverScreen.jsx
try { (() => {
/* Zeno — Discover (CHANGE 1): hub → scan/import → results review.
   First scan is free; trust reassurance is inline at every friction point. */
function DiscoverScreen({
  initialMethod,
  onClose,
  onManual,
  onAdded
}) {
  // stage: hub | email | csv | scanning | results
  const [stage, setStage] = React.useState("hub");
  const [method, setMethod] = React.useState(null);
  React.useEffect(() => {
    if (initialMethod === "email") {
      setMethod("email");
      setStage("email");
    } else if (initialMethod === "csv") {
      setMethod("csv");
      setStage("csv");
    } else if (initialMethod === "manual") {
      onManual && onManual();
    }
  }, [initialMethod]);
  const found = [{
    name: "Netflix",
    color: "#E50914",
    amount: 15.99,
    cat: "Entertainment",
    conf: "High"
  }, {
    name: "Spotify",
    color: "#1DB954",
    amount: 10.99,
    cat: "Music",
    conf: "High"
  }, {
    name: "ChatGPT Plus",
    color: "#10A37F",
    amount: 20.00,
    cat: "Productivity",
    conf: "High"
  }, {
    name: "iCloud+",
    color: "#3B82F6",
    amount: 2.99,
    cat: "Utilities",
    conf: "Medium"
  }, {
    name: "Figma",
    color: "#A259FF",
    amount: 12.00,
    cat: "Productivity",
    conf: "Medium"
  }, {
    name: "Audible",
    color: "#F8991C",
    amount: 14.95,
    cat: "Entertainment",
    conf: "Low"
  }];
  const TrustPanel = ({
    children
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
      background: "var(--success-soft)",
      border: "1px solid color-mix(in srgb, var(--success) 22%, transparent)",
      borderRadius: "var(--radius-md)",
      padding: "12px 14px",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield-check",
    size: 18,
    color: "var(--success)",
    style: {
      marginTop: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      color: "var(--text-secondary)",
      lineHeight: 1.45
    }
  }, children));
  const startScan = () => {
    setStage("scanning");
    setTimeout(() => setStage("results"), 2200);
  };

  // ---- HUB ----
  if (stage === "hub") {
    const methods = [{
      id: "csv",
      icon: "file-spreadsheet",
      title: "Import statement",
      body: "Most complete — read on-device.",
      badge: "CSV",
      go: () => {
        setMethod("csv");
        setStage("csv");
      }
    }, {
      id: "email",
      icon: "mail-search",
      title: "Scan email receipts",
      body: "Read-only, on-device, last 12 months.",
      go: () => {
        setMethod("email");
        setStage("email");
      }
    }, {
      id: "manual",
      icon: "pencil",
      title: "Add manually",
      body: "Pick from 600+ services or add your own.",
      go: () => onManual && onManual()
    }];
    return /*#__PURE__*/React.createElement(Sheet, {
      title: "Discover",
      onClose: onClose
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-sans)",
        fontSize: 12.5,
        color: "var(--text-tertiary)",
        margin: "0 0 16px"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "shield-check",
      size: 14,
      color: "var(--success)"
    }), " No bank login \u2014 three privacy-safe ways to find subscriptions."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, methods.map(m => /*#__PURE__*/React.createElement("button", {
      key: m.id,
      onClick: m.go,
      style: {
        display: "flex",
        gap: 13,
        alignItems: "center",
        textAlign: "left",
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "14px",
        cursor: "pointer",
        boxShadow: "var(--shadow-xs)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 42,
        height: 42,
        flex: "none",
        borderRadius: "var(--radius-md)",
        background: "var(--surface-sunken)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon,
      size: 21,
      color: "var(--text-secondary)"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontWeight: 650,
        fontSize: 14.5,
        color: "var(--text-primary)",
        whiteSpace: "nowrap"
      }
    }, m.title), m.badge && /*#__PURE__*/React.createElement(Badge, {
      tone: "accent"
    }, m.badge)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12.5,
        color: "var(--text-tertiary)",
        marginTop: 2
      }
    }, m.body)), /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-right",
      size: 18,
      color: "var(--text-tertiary)"
    })))));
  }

  // ---- EMAIL CONNECT ----
  if (stage === "email") {
    return /*#__PURE__*/React.createElement(Sheet, {
      title: "Scan email receipts",
      onBack: () => setStage("hub"),
      onClose: onClose
    }, /*#__PURE__*/React.createElement(TrustPanel, null, /*#__PURE__*/React.createElement("b", {
      style: {
        color: "var(--text-primary)"
      }
    }, "Read-only and on-device."), " Zeno scans the last 12 months of receipts right on your phone. We never store your email, and you can revoke access anytime."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: startScan,
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "mail",
        size: 18
      })
    }, "Connect Gmail (read-only)"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "lg",
      fullWidth: true,
      onClick: startScan,
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "mail",
        size: 18
      })
    }, "Connect Outlook")), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        color: "var(--text-tertiary)",
        marginTop: 16,
        textAlign: "center"
      }
    }, "Your first scan is free."));
  }

  // ---- CSV ----
  if (stage === "csv") {
    return /*#__PURE__*/React.createElement(Sheet, {
      title: "Import a statement",
      onBack: () => setStage("hub"),
      onClose: onClose
    }, /*#__PURE__*/React.createElement(TrustPanel, null, /*#__PURE__*/React.createElement("b", {
      style: {
        color: "var(--text-primary)"
      }
    }, "You stay in control."), " Export a CSV from your bank yourself \u2014 Zeno parses it on your device to spot recurring charges. The raw file is never uploaded."), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--surface-sunken)",
        borderRadius: "var(--radius-md)",
        padding: "14px 16px",
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "var(--text-tertiary)",
        marginBottom: 8
      }
    }, "How to export"), /*#__PURE__*/React.createElement("ol", {
      style: {
        margin: 0,
        paddingLeft: 18,
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        color: "var(--text-secondary)",
        lineHeight: 1.6
      }
    }, /*#__PURE__*/React.createElement("li", null, "Open your bank's website or app"), /*#__PURE__*/React.createElement("li", null, "Find statements \u2192 export as CSV"), /*#__PURE__*/React.createElement("li", null, "Pick the last 3\u201312 months"))), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: startScan,
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "upload",
        size: 18
      })
    }, "Choose CSV file"));
  }

  // ---- SCANNING ----
  if (stage === "scanning") {
    return /*#__PURE__*/React.createElement(Sheet, {
      title: method === "csv" ? "Reading statement" : "Scanning receipts",
      onClose: onClose
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "zeno-spin",
      style: {
        width: 52,
        height: 52,
        borderRadius: "50%",
        border: "4px solid var(--surface-sunken)",
        borderTopColor: "var(--accent)",
        marginBottom: 22
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontWeight: 650,
        fontSize: 16,
        color: "var(--text-primary)",
        lineHeight: 1.3,
        maxWidth: "26ch"
      }
    }, method === "csv" ? "Detecting recurring charges…" : "Looking for subscriptions…"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        color: "var(--text-tertiary)",
        marginTop: 8,
        maxWidth: "28ch"
      }
    }, "Running on your device \xB7 nothing leaves your phone"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setStage(method),
      style: {
        marginTop: 24,
        background: "none",
        border: "none",
        color: "var(--text-tertiary)",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer"
      }
    }, "Cancel")));
  }

  // ---- RESULTS REVIEW ----
  return /*#__PURE__*/React.createElement(ResultsReview, {
    found: found,
    method: method,
    onClose: onClose,
    onAdded: onAdded
  });
}
function ResultsReview({
  found,
  method,
  onClose,
  onAdded
}) {
  const [sel, setSel] = React.useState(() => found.map((_, i) => i < 5)); // low-confidence off by default
  const count = sel.filter(Boolean).length;
  const confTone = {
    High: ["var(--success-soft)", "var(--success)"],
    Medium: ["var(--warning-soft)", "#B45309"],
    Low: ["var(--surface-sunken)", "var(--text-tertiary)"]
  };
  return /*#__PURE__*/React.createElement(Sheet, {
    title: "Review found subscriptions",
    onClose: onClose,
    footer: /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      disabled: count === 0,
      onClick: () => onAdded(count)
    }, `Add ${count} subscription${count === 1 ? "" : "s"}`)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      color: "var(--text-secondary)",
      margin: "0 0 14px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check-check",
    size: 15,
    color: "var(--success)"
  }), /*#__PURE__*/React.createElement("span", null, "Found ", /*#__PURE__*/React.createElement("b", null, found.length), " via ", method === "csv" ? "your statement" : "email receipts", ". Pick what to track \u2014 you can edit any of them.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, found.map((f, i) => {
    const on = sel[i];
    const ct = confTone[f.conf];
    return /*#__PURE__*/React.createElement("div", {
      key: f.name,
      onClick: () => setSel(s => s.map((v, j) => j === i ? !v : v)),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "var(--surface-card)",
        border: `1.5px solid ${on ? "var(--accent)" : "var(--border-subtle)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "11px 13px",
        cursor: "pointer",
        boxShadow: "var(--shadow-xs)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 22,
        height: 22,
        flex: "none",
        borderRadius: 6,
        border: `1.5px solid ${on ? "var(--accent)" : "var(--border-strong)"}`,
        background: on ? "var(--accent)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, on && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 14,
      color: "var(--text-on-accent)",
      strokeWidth: 3
    })), /*#__PURE__*/React.createElement(ServiceAvatar, {
      name: f.name,
      color: f.color,
      size: 36
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontWeight: 650,
        fontSize: 14,
        color: "var(--text-primary)"
      }
    }, f.name), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginTop: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 11.5,
        color: "var(--text-tertiary)"
      }
    }, "$", f.amount.toFixed(2), "/mo \xB7 ", f.cat))), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: "none",
        fontFamily: "var(--font-sans)",
        fontSize: 10.5,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: "var(--radius-pill)",
        background: ct[0],
        color: ct[1]
      }
    }, f.conf));
  })));
}

/* Generic full-screen sheet shell with header + optional footer. */
function Sheet({
  title,
  onBack,
  onClose,
  footer,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background: "var(--surface-sunken)"
    }
  }, /*#__PURE__*/React.createElement(ScreenHeader, {
    title: title,
    left: onBack ? /*#__PURE__*/React.createElement(IconButton, {
      label: "Back",
      onClick: onBack
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-left",
      size: 24
    })) : null,
    right: /*#__PURE__*/React.createElement(IconButton, {
      label: "Close",
      onClick: onClose
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 22
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "4px 16px 16px"
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      padding: "12px 16px 28px",
      borderTop: "1px solid var(--border-subtle)",
      background: "var(--surface-card)"
    }
  }, footer));
}
window.DiscoverScreen = DiscoverScreen;
window.Sheet = Sheet;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/DiscoverScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/HomeScreen.jsx
try { (() => {
/* Zeno — Home / Triage (redesigned, CHANGE 3)
   Answers "what's about to charge me, and what can I cut?"
   No 9-item feature grid. Full list lives one tap away in the Subscriptions tab. */
function HomeScreen({
  hasData,
  onOpen,
  onTab,
  onDiscover,
  onAdd,
  onSettings,
  onBudget
}) {
  const Z = window.ZENO;
  const total = Z.monthlyTotal;
  const upcoming = Z.subscriptions.filter(s => ["active", "trial"].includes(s.status)).slice(0, 4);

  // Needs-attention items
  const attention = [];
  Z.subscriptions.forEach(s => {
    if (s.status === "trial") attention.push({
      id: s.id,
      sub: s,
      tone: "warning",
      icon: "alarm-clock",
      label: `${s.name} trial ends ${s.trialEnds}`,
      sub2: "Converts to paid — cancel before then?"
    });
    if (s.status === "attention") attention.push({
      id: s.id,
      sub: s,
      tone: "danger",
      icon: "triangle-alert",
      label: `${s.name} is still charging you`,
      sub2: `Cancelled ${s.cancelledOn} · charge not stopped`
    });
    if (s.priceHike) attention.push({
      id: s.id,
      sub: s,
      tone: "info",
      icon: "trending-up",
      label: `${s.name} went up`,
      sub2: `$${s.priceHike.from.toFixed(2)} → $${s.priceHike.to.toFixed(2)}/mo`
    });
  });
  const header = /*#__PURE__*/React.createElement(ScreenHeader, {
    large: true,
    title: "Home",
    left: /*#__PURE__*/React.createElement("button", {
      onClick: onSettings,
      "aria-label": "Settings",
      style: {
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement(ServiceAvatar, {
      name: "Alex Rivera",
      color: "var(--cat-teal)",
      size: 34,
      shape: "circle"
    })),
    right: /*#__PURE__*/React.createElement(IconButton, {
      label: "Notifications"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "bell"
    }))
  });
  if (!hasData) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }
    }, header, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 36px 40px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 64,
        height: 64,
        borderRadius: "var(--radius-xl)",
        background: "var(--accent-soft)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "radar",
      size: 30,
      color: "var(--accent-text)"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 22,
        color: "var(--text-primary)",
        marginBottom: 6
      }
    }, "Let's find what you're paying for"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 14.5,
        color: "var(--text-secondary)",
        lineHeight: 1.5,
        margin: "0 0 24px",
        maxWidth: "30ch"
      }
    }, "Nothing tracked yet. Run your first free scan \u2014 no bank login, processed on your device."), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: onDiscover,
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "search",
        size: 18
      })
    }, "Discover subscriptions"), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "md",
      fullWidth: true,
      onClick: onAdd,
      style: {
        marginTop: 8
      }
    }, "Add one manually")));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      overflowX: "hidden",
      paddingBottom: 24
    }
  }, header, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "4px 16px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--ink-900)",
      borderRadius: "var(--radius-2xl)",
      padding: "22px 22px 18px",
      boxShadow: "var(--shadow-lg)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      fontWeight: 600,
      color: "var(--ink-300)",
      textTransform: "uppercase",
      letterSpacing: "0.06em"
    }
  }, "Active this month"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      fontWeight: 600,
      color: "var(--ink-300)"
    }
  }, Z.trackedCount, "/", Z.freeLimit, " tracked")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(AmountDisplay, {
    amount: total,
    size: "xl",
    color: "#fff"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: "rgba(255,255,255,0.12)",
      borderRadius: 3,
      marginTop: 16,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${Z.trackedCount / Z.freeLimit * 100}%`,
      height: "100%",
      background: "var(--green-400)",
      borderRadius: 3
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      color: "var(--ink-400)",
      marginTop: 8
    }
  }, "Free plan \xB7 ", Z.freeLimit - Z.trackedCount, " slots left"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px 0"
    }
  }, (() => {
    const B = window.ZENO.budget;
    const over = B.projected > B.cap,
      approaching = !over && B.projected > 0.85 * B.cap;
    const sc = over ? ["var(--danger-soft)", "var(--danger)", "triangle-alert", "Over budget"] : approaching ? ["var(--warning-soft)", "#B45309", "trending-up", "Approaching"] : ["var(--success-soft)", "var(--success)", "circle-check", "On pace"];
    const pct = Math.min(100, B.projected / B.cap * 100);
    return /*#__PURE__*/React.createElement("button", {
      onClick: onBudget,
      style: {
        width: "100%",
        textAlign: "left",
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "14px 16px",
        cursor: "pointer",
        boxShadow: "var(--shadow-xs)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "target",
      size: 18,
      color: "var(--text-secondary)"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontFamily: "var(--font-sans)",
        fontWeight: 650,
        fontSize: 14.5,
        color: "var(--text-primary)"
      }
    }, "Monthly budget"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: "var(--radius-pill)",
        background: sc[0],
        color: sc[1]
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: sc[2],
      size: 13,
      color: sc[1]
    }), " ", sc[3])), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "baseline",
        gap: 6,
        marginTop: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: 17,
        color: "var(--text-primary)"
      }
    }, "$", B.projected.toFixed(2)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        color: "var(--text-tertiary)"
      }
    }, "projected / $", B.cap)), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 7,
        background: "var(--surface-sunken)",
        borderRadius: 4,
        overflow: "hidden",
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: `${pct}%`,
        height: "100%",
        background: sc[1],
        borderRadius: 4
      }
    })));
  })()), attention.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SectionTitle, {
    right: ""
  }, "Needs attention"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      padding: "0 16px"
    }
  }, attention.map((a, i) => {
    const c = {
      warning: ["var(--warning-soft)", "var(--warning)", "#B45309"],
      danger: ["var(--danger-soft)", "var(--danger)", "var(--danger)"],
      info: ["var(--info-soft)", "var(--info)", "var(--info)"]
    }[a.tone];
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: () => onOpen(a.sub.id),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        textAlign: "left",
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "12px 14px",
        cursor: "pointer",
        boxShadow: "var(--shadow-xs)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 38,
        height: 38,
        flex: "none",
        borderRadius: "var(--radius-md)",
        background: c[0],
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: a.icon,
      size: 19,
      color: c[1]
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontWeight: 650,
        fontSize: 14,
        color: "var(--text-primary)"
      }
    }, a.label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12.5,
        color: "var(--text-tertiary)",
        marginTop: 1
      }
    }, a.sub2)), /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-right",
      size: 17,
      color: "var(--text-tertiary)"
    }));
  }))), /*#__PURE__*/React.createElement(SectionTitle, {
    onSeeAll: () => onTab("subs")
  }, "Upcoming renewals"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 16px"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "none"
  }, upcoming.map((s, i) => /*#__PURE__*/React.createElement(ListRow, {
    key: s.id,
    divider: i < upcoming.length - 1,
    leading: /*#__PURE__*/React.createElement(ServiceAvatar, {
      name: s.name,
      color: s.color
    }),
    title: s.name,
    subtitle: `${s.category} · ${s.next}`,
    amount: `$${s.amount.toFixed(2)}`,
    cadence: s.cadence,
    chevron: true,
    onClick: () => onOpen(s.id)
  })))), /*#__PURE__*/React.createElement(SectionTitle, {
    onSeeAll: () => onTab("insights")
  }, "Ways to save"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 16px",
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, Z.insights.slice(0, 2).map(ins => /*#__PURE__*/React.createElement("button", {
    key: ins.id,
    onClick: () => onTab("insights"),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      textAlign: "left",
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      padding: "12px 14px",
      cursor: "pointer",
      boxShadow: "var(--shadow-xs)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      flex: "none",
      borderRadius: "var(--radius-md)",
      background: "var(--accent-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ins.icon,
    size: 19,
    color: "var(--accent-text)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 650,
      fontSize: 14,
      color: "var(--text-primary)"
    }
  }, ins.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      color: "var(--text-tertiary)",
      marginTop: 1
    }
  }, ins.body)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      fontWeight: 700,
      color: "var(--accent-text)"
    }
  }, "$", ins.save, "/yr")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      padding: "20px 16px 0"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: onDiscover,
    style: {
      flex: 1
    },
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 18
    })
  }, "Discover"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    onClick: onAdd,
    style: {
      flex: 1
    },
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 18
    })
  }, "Add manually")));
}
function SectionTitle({
  children,
  onSeeAll,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "22px 20px 10px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 17,
      color: "var(--text-primary)"
    }
  }, children), onSeeAll && /*#__PURE__*/React.createElement("span", {
    onClick: onSeeAll,
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      fontWeight: 600,
      color: "var(--accent-text)",
      cursor: "pointer"
    }
  }, "See all"));
}
window.HomeScreen = HomeScreen;
window.SectionTitle = SectionTitle;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/InsightsScreen.jsx
try { (() => {
/* Zeno — Insights tab (was Analytics/Budget). Spend intelligence + Pro tool entries. */
function InsightsScreen({
  onUpgrade,
  onBudget
}) {
  const Z = window.ZENO;
  const [range, setRange] = React.useState("6 mo");
  const max = Math.max(...Z.trend.map(t => t[1]));
  const total = Z.monthlyTotal;
  const catTotal = Z.categories.reduce((a, c) => a + c.spent, 0);
  const B = Z.budget;
  const over = B.projected > B.cap,
    approaching = !over && B.projected > 0.85 * B.cap;
  const bsc = over ? ["var(--danger-soft)", "var(--danger)", "triangle-alert", "Over budget"] : approaching ? ["var(--warning-soft)", "#B45309", "trending-up", "Approaching"] : ["var(--success-soft)", "var(--success)", "circle-check", "On pace"];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      overflowX: "hidden",
      paddingBottom: 24
    }
  }, /*#__PURE__*/React.createElement(ScreenHeader, {
    large: true,
    title: "Insights"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "4px 16px 0"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBudget,
    style: {
      width: "100%",
      textAlign: "left",
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      padding: "16px",
      cursor: "pointer",
      boxShadow: "var(--shadow-xs)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      flex: "none",
      borderRadius: "var(--radius-md)",
      background: "var(--accent-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "target",
    size: 20,
    color: "var(--accent-text)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 16,
      color: "var(--text-primary)"
    }
  }, "Budget"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      color: "var(--text-tertiary)"
    }
  }, "Forecast $", B.projected.toFixed(2), " / $", B.cap, " this month")), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      fontWeight: 700,
      padding: "3px 9px",
      borderRadius: "var(--radius-pill)",
      background: bsc[0],
      color: bsc[1]
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: bsc[2],
    size: 13,
    color: bsc[1]
  }), " ", bsc[3])))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 16px 0"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      fontWeight: 600,
      color: "var(--text-tertiary)",
      textTransform: "uppercase",
      letterSpacing: "0.05em"
    }
  }, "Monthly spend"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(AmountDisplay, {
    amount: total,
    size: "md",
    trend: "up",
    trendValue: "16%"
  }))), /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, range)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 10,
      height: 110,
      marginTop: 20
    }
  }, Z.trend.map(([m, v], i) => {
    const last = i === Z.trend.length - 1;
    return /*#__PURE__*/React.createElement("div", {
      key: m,
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        maxWidth: 30,
        height: `${v / max * 84}px`,
        background: last ? "var(--accent)" : "var(--accent-soft-2)",
        borderRadius: "var(--radius-sm)",
        transition: "height var(--dur-slow) var(--ease-out)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        color: last ? "var(--text-primary)" : "var(--text-tertiary)",
        fontWeight: last ? 700 : 500
      }
    }, m));
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 17,
      color: "var(--text-primary)",
      padding: "22px 20px 10px"
    }
  }, "Where it goes"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 16px"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "md"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 3,
      height: 10,
      marginBottom: 16,
      borderRadius: "var(--radius-pill)",
      overflow: "hidden"
    }
  }, Z.categories.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.category,
    style: {
      flex: c.spent,
      background: `var(--cat-${c.cat})`
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, Z.categories.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.category,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: `var(--cat-${c.cat})`,
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      fontWeight: 500,
      color: "var(--text-primary)"
    }
  }, c.category), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      color: "var(--text-tertiary)"
    }
  }, Math.round(c.spent / catTotal * 100), "%"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 14,
      fontWeight: 700,
      color: "var(--text-primary)",
      width: 60,
      textAlign: "right"
    }
  }, "$", c.spent.toFixed(2))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 17,
      color: "var(--text-primary)",
      padding: "22px 20px 10px"
    }
  }, "Ways to save"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 16px",
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, Z.insights.map(ins => /*#__PURE__*/React.createElement("div", {
    key: ins.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      padding: "12px 14px",
      boxShadow: "var(--shadow-xs)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      flex: "none",
      borderRadius: "var(--radius-md)",
      background: "var(--accent-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ins.icon,
    size: 19,
    color: "var(--accent-text)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 650,
      fontSize: 14,
      color: "var(--text-primary)"
    }
  }, ins.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      color: "var(--text-tertiary)",
      marginTop: 1
    }
  }, ins.body)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      fontWeight: 700,
      color: "var(--accent-text)"
    }
  }, "$", ins.save, "/yr")))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 17,
      color: "var(--text-primary)",
      padding: "22px 20px 10px"
    }
  }, "Power tools"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 16px",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10
    }
  }, [["AI Spend Coach", "sparkles"], ["Spend Twin", "shuffle"], ["Year in Review", "gift"], ["Widgets & Watch", "layout-grid"]].map(([t, ic]) => /*#__PURE__*/React.createElement("button", {
    key: t,
    onClick: onUpgrade,
    style: {
      textAlign: "left",
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      padding: "14px",
      cursor: "pointer",
      boxShadow: "var(--shadow-xs)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 22,
    color: "var(--text-secondary)"
  }), /*#__PURE__*/React.createElement(Badge, {
    tone: "pro",
    solid: false,
    style: {
      background: "#e9e9f2",
      color: "#43417a"
    }
  }, "Pro")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 650,
      fontSize: 14,
      color: "var(--text-primary)",
      marginTop: 12
    }
  }, t)))));
}
window.InsightsScreen = InsightsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/InsightsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/OnboardingScreen.jsx
try { (() => {
/* Zeno — Onboarding (redesigned, CHANGE 7)
   Sequence: trust beats → sign up + 16+ age gate → first-discovery launchpad.
   The experience-"mode" choice is gone from the critical path. */
function OnboardingScreen({
  onComplete
}) {
  const [step, setStep] = React.useState(0); // 0 welcome, 1 auth, 2 launchpad
  const [age, setAge] = React.useState(false);
  const beats = [{
    icon: "shield-check",
    title: "No bank login. Ever.",
    body: "Zeno never asks for your banking credentials — and never sees them."
  }, {
    icon: "smartphone",
    title: "Your data stays on your device",
    body: "We find subscriptions from email receipts and statements you control. It's processed on-device and encrypted."
  }, {
    icon: "bell-ring",
    title: "Warned before you're charged",
    body: "A heads-up 7 and 3 days before any renewal or trial conversion — never a surprise."
  }];
  if (step === 0) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "8px 28px 0",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginTop: 6
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/zeno-mark.svg",
      width: "30",
      height: "30",
      style: {
        color: "var(--ink-900)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 22,
        letterSpacing: "-0.02em"
      }
    }, "zeno")), /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 30,
        lineHeight: 1.1,
        letterSpacing: "-0.02em",
        margin: "28px 0 6px",
        textWrap: "balance"
      }
    }, "The honest way to take back your subscriptions."), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 15,
        color: "var(--text-secondary)",
        margin: "0 0 26px",
        lineHeight: 1.5
      }
    }, "Built for people who refuse to hand a bank login to an app."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 16
      }
    }, beats.map(b => /*#__PURE__*/React.createElement("div", {
      key: b.title,
      style: {
        display: "flex",
        gap: 13,
        alignItems: "flex-start"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 40,
        height: 40,
        flex: "none",
        borderRadius: "var(--radius-md)",
        background: "var(--accent-soft)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: b.icon,
      size: 20,
      color: "var(--accent-text)"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontWeight: 700,
        fontSize: 15,
        color: "var(--text-primary)"
      }
    }, b.title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        color: "var(--text-tertiary)",
        marginTop: 1,
        lineHeight: 1.45
      }
    }, b.body))))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: "auto",
        padding: "20px 0 28px"
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: () => setStep(1)
    }, "Get started")));
  }
  if (step === 1) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "8px 28px 0",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      label: "Back",
      onClick: () => setStep(0),
      style: {
        marginLeft: -8
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-left",
      size: 24
    })), /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 28,
        letterSpacing: "-0.02em",
        margin: "18px 0 8px"
      }
    }, "Create your account"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        color: "var(--text-secondary)",
        margin: "0 0 22px"
      }
    }, "No card required to start. Cancel anytime \u2014 and we mean it."), /*#__PURE__*/React.createElement("button", {
      onClick: () => setAge(a => !a),
      style: {
        display: "flex",
        gap: 11,
        alignItems: "flex-start",
        textAlign: "left",
        background: "var(--surface-card)",
        border: `1.5px solid ${age ? "var(--accent)" : "var(--border-default)"}`,
        borderRadius: "var(--radius-md)",
        padding: "12px 14px",
        cursor: "pointer",
        marginBottom: 18
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 22,
        height: 22,
        flex: "none",
        borderRadius: 6,
        border: `1.5px solid ${age ? "var(--accent)" : "var(--border-strong)"}`,
        background: age ? "var(--accent)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 1
      }
    }, age && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 15,
      color: "var(--text-on-accent)",
      strokeWidth: 3
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 13.5,
        color: "var(--text-secondary)",
        lineHeight: 1.45
      }
    }, "I confirm I'm ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: "var(--text-primary)"
      }
    }, "16 or older"), " and agree to the Terms & Privacy Policy.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10,
        opacity: age ? 1 : 0.45,
        pointerEvents: age ? "auto" : "none",
        transition: "opacity var(--dur) var(--ease-out)"
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: () => setStep(2),
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "mail",
        size: 18
      })
    }, "Continue with email"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "lg",
      fullWidth: true,
      onClick: () => setStep(2),
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "apple",
        size: 18
      })
    }, "Continue with Apple"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "lg",
      fullWidth: true,
      onClick: () => setStep(2),
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "globe",
        size: 18
      })
    }, "Continue with Google")), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        color: "var(--text-tertiary)",
        marginTop: "auto",
        padding: "16px 0 26px",
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 13,
      color: "var(--text-tertiary)"
    }), " We email a magic link \u2014 no password to leak."));
  }

  // step 2 — first-discovery launchpad (free, no paywall)
  const methods = [{
    id: "csv",
    icon: "file-spreadsheet",
    title: "Import statement",
    body: "Most complete — you export it, read on-device.",
    badge: "CSV"
  }, {
    id: "email",
    icon: "mail-search",
    title: "Scan email receipts",
    body: "Read-only, on-device, last 12 months."
  }, {
    id: "manual",
    icon: "pencil",
    title: "Add manually",
    body: "Pick from 600+ services or add your own."
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      padding: "8px 24px 0",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 46,
      height: 46,
      borderRadius: "var(--radius-md)",
      background: "var(--accent-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 22,
    color: "var(--accent-text)"
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 27,
      letterSpacing: "-0.02em",
      margin: "16px 0 6px",
      textWrap: "balance"
    }
  }, "Let's find what you're paying for"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      color: "var(--text-secondary)",
      margin: "0 0 8px",
      lineHeight: 1.5
    }
  }, "Your first scan is ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--accent-text)"
    }
  }, "free"), ". Pick how you'd like to start."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      color: "var(--text-tertiary)",
      margin: "0 0 18px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield-check",
    size: 14,
    color: "var(--success)"
  }), " No bank login. Nothing leaves your device unencrypted."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, methods.map(m => /*#__PURE__*/React.createElement("button", {
    key: m.id,
    onClick: () => onComplete(m.id),
    style: {
      display: "flex",
      gap: 13,
      alignItems: "center",
      textAlign: "left",
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      padding: "14px 14px",
      cursor: "pointer",
      boxShadow: "var(--shadow-xs)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 42,
      height: 42,
      flex: "none",
      borderRadius: "var(--radius-md)",
      background: "var(--surface-sunken)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon,
    size: 21,
    color: "var(--text-secondary)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 650,
      fontSize: 14.5,
      color: "var(--text-primary)",
      whiteSpace: "nowrap"
    }
  }, m.title), m.badge && /*#__PURE__*/React.createElement(Badge, {
    tone: "accent"
  }, m.badge)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      color: "var(--text-tertiary)",
      marginTop: 2,
      lineHeight: 1.4
    }
  }, m.body)), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 18,
    color: "var(--text-tertiary)"
  })))), /*#__PURE__*/React.createElement("button", {
    onClick: () => onComplete(null),
    style: {
      marginTop: "auto",
      marginBottom: 26,
      background: "none",
      border: "none",
      color: "var(--text-tertiary)",
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      padding: "16px 0 10px"
    }
  }, "Skip for now"));
}
window.OnboardingScreen = OnboardingScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/OnboardingScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/PaywallScreen.jsx
try { (() => {
/* Zeno — Paywall / Plans (shown only after value: hitting a limit or a Pro tool). */
function PaywallScreen({
  onClose,
  reason
}) {
  const [plan, setPlan] = React.useState("annual");
  const features = ["Unlimited subscriptions", "Ongoing auto-discovery (repeat scans)", "Full analytics & insights engine", "AI Spend Coach + Spend Twin", "Year in Review & widgets"];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background: "var(--surface-card)"
    }
  }, /*#__PURE__*/React.createElement(ScreenHeader, {
    title: "",
    right: /*#__PURE__*/React.createElement(IconButton, {
      label: "Close",
      onClick: onClose
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 22
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "0 24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 52,
      height: 52,
      borderRadius: "var(--radius-lg)",
      background: "var(--accent-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 26,
    color: "var(--accent-text)"
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 28,
      letterSpacing: "-0.02em",
      margin: "16px 0 6px"
    }
  }, "Zeno Pro"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 14.5,
      color: "var(--text-secondary)",
      margin: "0 0 22px"
    }
  }, reason || "You've felt the value — here's everything Pro unlocks."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 11,
      marginBottom: 22
    }
  }, features.map(f => /*#__PURE__*/React.createElement("div", {
    key: f,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      flex: "none",
      borderRadius: "50%",
      background: "var(--accent-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 14,
    color: "var(--accent-text)",
    strokeWidth: 3
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 14.5,
      color: "var(--text-primary)"
    }
  }, f)))), [["annual", "Annual", "$39.99/yr", "Save 33% · 7-day free trial"], ["monthly", "Monthly", "$4.99/mo", "Billed monthly"]].map(([id, t, price, note]) => {
    const on = plan === id;
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => setPlan(id),
      style: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        textAlign: "left",
        background: on ? "var(--accent-soft)" : "var(--surface-card)",
        border: `1.5px solid ${on ? "var(--accent)" : "var(--border-default)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "14px 16px",
        cursor: "pointer",
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 20,
        height: 20,
        flex: "none",
        borderRadius: "50%",
        border: `2px solid ${on ? "var(--accent)" : "var(--border-strong)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, on && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: "var(--accent)"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontWeight: 700,
        fontSize: 15,
        color: "var(--text-primary)"
      }
    }, t), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12.5,
        color: "var(--text-tertiary)"
      }
    }, note)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 15,
        fontWeight: 700,
        color: "var(--text-primary)"
      }
    }, price));
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      color: "var(--text-tertiary)",
      textAlign: "center",
      margin: "8px 0 0"
    }
  }, "Restore purchases \xB7 Terms \xB7 Privacy")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      padding: "12px 24px 28px",
      borderTop: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: onClose
  }, plan === "annual" ? "Start 7-day free trial" : "Subscribe")));
}
window.PaywallScreen = PaywallScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/PaywallScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/SettingsScreen.jsx
try { (() => {
/* Zeno — Settings (CHANGE 8: privacy & exit are easy to find, not buried). */
function SettingsScreen({
  dark,
  onToggleDark,
  onUpgrade,
  onBack
}) {
  const [reminders, setReminders] = React.useState(true);
  const [quiet, setQuiet] = React.useState(true);
  const Group = ({
    children
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 16px",
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "none"
  }, children));
  const GroupTitle = ({
    children
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: "var(--text-tertiary)",
      padding: "8px 24px 8px"
    }
  }, children);
  const tile = (name, bg) => /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: "var(--radius-sm)",
      background: bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: name,
    size: 17,
    color: "#fff"
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      overflowX: "hidden",
      paddingBottom: 24
    }
  }, /*#__PURE__*/React.createElement(ScreenHeader, {
    large: true,
    title: "Settings",
    left: onBack ? /*#__PURE__*/React.createElement(IconButton, {
      label: "Back",
      onClick: onBack
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-left",
      size: 24
    })) : null
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "4px 16px 18px"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "md",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(ServiceAvatar, {
    name: "Alex Rivera",
    color: "var(--cat-teal)",
    size: 52,
    shape: "circle"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 18,
      color: "var(--text-primary)"
    }
  }, "Alex Rivera"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      color: "var(--text-tertiary)"
    }
  }, "alex@hey.com")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    onClick: onUpgrade
  }, "Go Pro"))), /*#__PURE__*/React.createElement(GroupTitle, null, "Notifications"), /*#__PURE__*/React.createElement(Group, null, /*#__PURE__*/React.createElement(ListRow, {
    leading: tile("bell", "var(--cat-coral)"),
    title: "Renewal reminders",
    subtitle: "7 \xB7 3 \xB7 day-of",
    trailing: /*#__PURE__*/React.createElement(Switch, {
      checked: reminders,
      onChange: setReminders
    }),
    divider: true
  }), /*#__PURE__*/React.createElement(ListRow, {
    leading: tile("moon-star", "var(--cat-violet)"),
    title: "Quiet hours",
    subtitle: "10pm \u2013 8am",
    trailing: /*#__PURE__*/React.createElement(Switch, {
      checked: quiet,
      onChange: setQuiet
    })
  })), /*#__PURE__*/React.createElement(GroupTitle, null, "App"), /*#__PURE__*/React.createElement(Group, null, /*#__PURE__*/React.createElement(ListRow, {
    leading: tile("moon", "var(--ink-700)"),
    title: "Dark mode",
    trailing: /*#__PURE__*/React.createElement(Switch, {
      checked: dark,
      onChange: onToggleDark
    }),
    divider: true
  }), /*#__PURE__*/React.createElement(ListRow, {
    leading: tile("palette", "var(--cat-amber)"),
    title: "Appearance & icon",
    subtitle: "Optional themes",
    chevron: true,
    onClick: () => {},
    divider: true
  }), /*#__PURE__*/React.createElement(ListRow, {
    leading: tile("mail-search", "var(--cat-blue)"),
    title: "Connected inboxes",
    trailing: /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        color: "var(--text-tertiary)"
      }
    }, "1 connected"),
    chevron: true,
    onClick: () => {},
    divider: true
  }), /*#__PURE__*/React.createElement(ListRow, {
    leading: tile("users", "var(--cat-green)"),
    title: "Family / Household",
    chevron: true,
    onClick: () => {}
  })), /*#__PURE__*/React.createElement(GroupTitle, null, "Data & privacy"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 16px 8px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 9,
      alignItems: "flex-start",
      background: "var(--success-soft)",
      border: "1px solid color-mix(in srgb, var(--success) 20%, transparent)",
      borderRadius: "var(--radius-md)",
      padding: "11px 13px",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield-check",
    size: 17,
    color: "var(--success)",
    style: {
      marginTop: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      color: "var(--text-secondary)",
      lineHeight: 1.45
    }
  }, "Your financial data is encrypted on this device. We never see your bank login or your data."))), /*#__PURE__*/React.createElement(Group, null, /*#__PURE__*/React.createElement(ListRow, {
    leading: tile("download", "var(--cat-slate)"),
    title: "Export my data",
    subtitle: "Download everything as CSV",
    chevron: true,
    onClick: () => {},
    divider: true
  }), /*#__PURE__*/React.createElement(ListRow, {
    leading: tile("trash-2", "var(--danger)"),
    title: "Delete all my data",
    subtitle: "Erase everything from this device",
    chevron: true,
    onClick: () => {}
  })), /*#__PURE__*/React.createElement(GroupTitle, null, "Account"), /*#__PURE__*/React.createElement(Group, null, /*#__PURE__*/React.createElement(ListRow, {
    leading: tile("credit-card", "var(--cat-blue)"),
    title: "Plan & billing",
    trailing: /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--text-tertiary)"
      }
    }, "Free"),
    chevron: true,
    onClick: onUpgrade,
    divider: true
  }), /*#__PURE__*/React.createElement(ListRow, {
    leading: tile("circle-help", "var(--cat-teal)"),
    title: "Help & feedback",
    chevron: true,
    onClick: () => {}
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 16px",
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    fullWidth: true,
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "log-out",
      size: 18
    })
  }, "Sign out"), /*#__PURE__*/React.createElement("button", {
    style: {
      background: "none",
      border: "none",
      color: "var(--danger)",
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      padding: "8px"
    }
  }, "Cancel my Zeno account")));
}
window.SettingsScreen = SettingsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/SettingsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/SubscriptionDetailScreen.jsx
try { (() => {
/* Zeno — Subscription detail (CHANGE 6 real history, CHANGE 4 verification states) */
function SubscriptionDetailScreen({
  id,
  onBack,
  onCancel
}) {
  const s = window.ZENO.subscriptions.find(x => x.id === id) || window.ZENO.subscriptions[0];
  const [reminder, setReminder] = React.useState(true);
  const yearly = (s.amount * 12).toFixed(2);
  const billing = ["active", "trial"].includes(s.status);

  // Verification banner per status
  const banner = {
    pending: ["info", "clock", "Cancellation pending verification", `You cancelled on ${s.cancelledOn}. We'll confirm there's no charge around ${s.next}.`],
    attention: ["danger", "triangle-alert", "Still being charged", `Cancelled ${s.cancelledOn}, but a charge appeared on ${s.history[0] && s.history[0][0]}. Needs attention.`],
    cancelled: ["success", "check-check", "Verified cancelled", `No charge found after ${s.cancelledOn}. You're saving $${yearly}/yr.`],
    trial: ["warning", "alarm-clock", "Free trial", `Converts to $${s.amount.toFixed(2)}/mo on ${s.trialEnds}. Cancel before then to avoid it.`]
  }[s.status];
  const rows = [{
    icon: "tag",
    label: "Category",
    value: s.category
  }, {
    icon: "calendar",
    label: "Next payment",
    value: billing ? s.next : "—"
  }, {
    icon: "repeat",
    label: "Billing cycle",
    value: s.cadence === "mo" ? "Monthly" : "Yearly"
  }, {
    icon: "circle-dollar-sign",
    label: "Per year",
    value: `$${yearly}`
  }];
  const bc = banner && {
    info: ["var(--info-soft)", "var(--info)"],
    danger: ["var(--danger-soft)", "var(--danger)"],
    success: ["var(--success-soft)", "var(--success)"],
    warning: ["var(--warning-soft)", "#B45309"]
  }[banner[0]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      overflowX: "hidden",
      paddingBottom: 24
    }
  }, /*#__PURE__*/React.createElement(ScreenHeader, {
    title: "",
    left: /*#__PURE__*/React.createElement(IconButton, {
      label: "Back",
      onClick: onBack
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-left",
      size: 24
    })),
    right: /*#__PURE__*/React.createElement(IconButton, {
      label: "More"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "more-horizontal",
      size: 22
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "4px 20px 16px"
    }
  }, /*#__PURE__*/React.createElement(ServiceAvatar, {
    name: s.name,
    color: s.color,
    size: 72
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 24,
      marginTop: 12,
      color: "var(--text-primary)"
    }
  }, s.name), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(StatusPill, {
    status: s.status
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(AmountDisplay, {
    amount: s.amount,
    cadence: s.cadence,
    size: "lg"
  }))), banner && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 16px 4px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 11,
      alignItems: "flex-start",
      background: bc[0],
      borderRadius: "var(--radius-lg)",
      padding: "14px 16px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: banner[1],
    size: 20,
    color: bc[1],
    style: {
      marginTop: 1
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 700,
      fontSize: 14,
      color: "var(--text-primary)"
    }
  }, banner[2]), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      color: "var(--text-secondary)",
      marginTop: 2,
      lineHeight: 1.45
    }
  }, banner[3]), s.status === "attention" && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    size: "sm",
    onClick: () => onCancel(s.id),
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "life-buoy",
      size: 15
    })
  }, "Re-open cancellation help"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px 0"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "none"
  }, rows.map((r, i) => /*#__PURE__*/React.createElement(ListRow, {
    key: r.label,
    divider: i < rows.length - 1,
    leading: /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-sunken)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: r.icon,
      size: 17,
      color: "var(--text-secondary)"
    })),
    title: r.label,
    trailing: /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        fontWeight: 600,
        color: "var(--text-secondary)"
      }
    }, r.value)
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "22px 20px 10px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 17,
      color: "var(--text-primary)"
    }
  }, "Charge history"), s.history.length > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--text-tertiary)"
    }
  }, s.history.length, " charges")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 16px"
    }
  }, s.history.length === 0 ? /*#__PURE__*/React.createElement(Card, {
    padding: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      color: "var(--text-tertiary)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "receipt",
    size: 26,
    color: "var(--text-tertiary)",
    style: {
      margin: "0 auto 10px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: 14,
      color: "var(--text-secondary)"
    }
  }, "No charges tracked yet"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      marginTop: 3
    }
  }, "We'll log each charge here as it happens."))) : /*#__PURE__*/React.createElement(Card, {
    padding: "none"
  }, (s.history.length > 5 ? s.history.slice(0, 5) : s.history).map(([date, amt], i, arr) => /*#__PURE__*/React.createElement(ListRow, {
    key: date,
    divider: i < arr.length - 1,
    leading: /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-sunken)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "receipt",
      size: 16,
      color: "var(--text-tertiary)"
    })),
    title: date,
    trailing: /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 14,
        fontWeight: 700,
        color: "var(--text-primary)"
      }
    }, "$", amt.toFixed(2))
  })), s.history.length > 5 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 14px",
      textAlign: "center",
      borderTop: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      fontWeight: 600,
      color: "var(--accent-text)",
      cursor: "pointer"
    }
  }, "Show all ", s.history.length, " charges")))), billing && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px 0"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "md"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      color: "var(--text-primary)"
    }
  }, "Payment reminders"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-tertiary)",
      marginTop: 1
    }
  }, "7 and 3 days before renewal")), /*#__PURE__*/React.createElement(Switch, {
    checked: reminder,
    onChange: setReminder
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      padding: "20px 16px 0"
    }
  }, billing && /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    fullWidth: true,
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "pause",
      size: 18
    })
  }, "Pause subscription"), billing && /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    size: "lg",
    fullWidth: true,
    onClick: () => onCancel(s.id),
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "circle-x",
      size: 18
    })
  }, "Cancel subscription")));
}
window.SubscriptionDetailScreen = SubscriptionDetailScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/SubscriptionDetailScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/SubscriptionsScreen.jsx
try { (() => {
/* Zeno — Subscriptions tab (NEW, CHANGE 2)
   The single authoritative home for every subscription: search + status filters. */
function SubscriptionsScreen({
  onOpen,
  onAdd
}) {
  const Z = window.ZENO;
  const [filter, setFilter] = React.useState("All");
  const [q, setQ] = React.useState("");
  const filters = ["All", "Active", "Paused", "Pending", "Cancelled"];
  const statusFor = {
    Active: ["active", "trial"],
    Paused: ["paused"],
    Pending: ["pending", "attention"],
    Cancelled: ["cancelled"]
  };
  let list = Z.subscriptions;
  if (filter !== "All") list = list.filter(s => statusFor[filter].includes(s.status));
  if (q.trim()) list = list.filter(s => s.name.toLowerCase().includes(q.toLowerCase()));
  const billing = Z.subscriptions.filter(s => ["active", "trial"].includes(s.status));
  const total = billing.reduce((a, s) => a + s.amount, 0);
  const emptyCopy = {
    All: ["Nothing tracked yet", "Run a scan or add a subscription to get started."],
    Active: ["No active subscriptions", "Anything currently billing will show here."],
    Paused: ["Nothing paused", "Pause a subscription to keep it without tracking renewals."],
    Pending: ["Nothing pending", "Cancellations waiting to be verified appear here."],
    Cancelled: ["Nothing cancelled yet", "Subscriptions you've verified-cancelled live here."]
  }[filter];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(ScreenHeader, {
    large: true,
    title: "Subscriptions",
    right: /*#__PURE__*/React.createElement(IconButton, {
      label: "Add",
      onClick: onAdd
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus"
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px 12px",
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      color: "var(--text-tertiary)"
    }
  }, billing.length, " billing \xB7 ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--text-secondary)"
    }
  }, "$", total.toFixed(2), "/mo"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 16px 10px",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(Input, {
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 18
    }),
    placeholder: "Search subscriptions",
    value: q,
    onChange: e => setQ(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 7,
      padding: "0 16px 12px",
      overflowX: "auto",
      flex: "none"
    }
  }, filters.map(f => {
    const on = filter === f;
    const count = f === "All" ? Z.subscriptions.length : Z.subscriptions.filter(s => statusFor[f].includes(s.status)).length;
    return /*#__PURE__*/React.createElement("button", {
      key: f,
      onClick: () => setFilter(f),
      style: {
        flex: "none",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 32,
        padding: "0 13px",
        borderRadius: "var(--radius-pill)",
        border: `1px solid ${on ? "transparent" : "var(--border-default)"}`,
        background: on ? "var(--ink-900)" : "transparent",
        color: on ? "#fff" : "var(--text-secondary)",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer"
      }
    }, f, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        opacity: 0.6
      }
    }, count));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "0 16px 24px"
    }
  }, list.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "60px 30px",
      color: "var(--text-tertiary)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "inbox",
    size: 30,
    color: "var(--text-tertiary)",
    style: {
      margin: "0 auto 12px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 650,
      fontSize: 15,
      color: "var(--text-secondary)"
    }
  }, emptyCopy[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      marginTop: 4
    }
  }, emptyCopy[1]), filter === "All" && /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "md",
    onClick: onAdd,
    style: {
      marginTop: 16
    }
  }, "Add a subscription")) : /*#__PURE__*/React.createElement(Card, {
    padding: "none"
  }, list.map((s, i) => /*#__PURE__*/React.createElement(ListRow, {
    key: s.id,
    divider: i < list.length - 1,
    leading: /*#__PURE__*/React.createElement(ServiceAvatar, {
      name: s.name,
      color: s.color
    }),
    title: s.name,
    subtitle: /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(StatusPill, {
      status: s.status
    })),
    trailing: /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "right"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 14,
        fontWeight: 700,
        color: "var(--text-primary)"
      }
    }, "$", s.amount.toFixed(2)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 11.5,
        color: "var(--text-tertiary)"
      }
    }, s.status === "active" || s.status === "trial" ? s.next : s.status === "paused" ? "paused" : "")),
    onClick: () => onOpen(s.id),
    style: ["paused", "cancelled"].includes(s.status) ? {
      opacity: 0.6
    } : null
  })))));
}
window.SubscriptionsScreen = SubscriptionsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/SubscriptionsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/data.js
try { (() => {
/* Sample data for the Zeno app UI kit (redesigned IA).
   Statuses: active · trial · paused · pending (cancel pending verification)
   · cancelled (verified) · attention (still being charged after cancel). */
window.ZENO = {
  subscriptions: [{
    id: "netflix",
    name: "Netflix",
    color: "#E50914",
    category: "Entertainment",
    cat: "violet",
    amount: 15.99,
    cadence: "mo",
    next: "Jun 28",
    status: "active",
    history: [["Jun 28", 15.99], ["May 28", 15.99], ["Apr 28", 13.99], ["Mar 28", 13.99], ["Feb 28", 13.99], ["Jan 28", 13.99]],
    priceHike: {
      from: 13.99,
      to: 15.99
    }
  }, {
    id: "spotify",
    name: "Spotify",
    color: "#1DB954",
    category: "Music",
    cat: "coral",
    amount: 10.99,
    cadence: "mo",
    next: "Jul 2",
    status: "active",
    history: [["Jun 02", 10.99], ["May 02", 10.99], ["Apr 02", 10.99], ["Mar 02", 10.99]]
  }, {
    id: "chatgpt",
    name: "ChatGPT Plus",
    color: "#10A37F",
    category: "Productivity",
    cat: "blue",
    amount: 20.00,
    cadence: "mo",
    next: "Jul 4",
    status: "active",
    history: [["Jun 04", 20.00], ["May 04", 20.00]]
  }, {
    id: "icloud",
    name: "iCloud+",
    color: "#3B82F6",
    category: "Utilities",
    cat: "amber",
    amount: 2.99,
    cadence: "mo",
    next: "Jul 5",
    status: "active",
    history: [["Jun 05", 2.99], ["May 05", 2.99], ["Apr 05", 2.99], ["Mar 05", 2.99], ["Feb 05", 2.99]]
  }, {
    id: "figma",
    name: "Figma",
    color: "#A259FF",
    category: "Productivity",
    cat: "blue",
    amount: 12.00,
    cadence: "mo",
    next: "Jul 9",
    status: "active",
    unused: true,
    history: [["Jun 09", 12.00], ["May 09", 12.00], ["Apr 09", 12.00]]
  }, {
    id: "disney",
    name: "Disney+",
    color: "#113CCF",
    category: "Entertainment",
    cat: "violet",
    amount: 13.99,
    cadence: "mo",
    next: "Jul 12",
    status: "trial",
    trialEnds: "Jul 12",
    history: []
  }, {
    id: "audible",
    name: "Audible",
    color: "#F8991C",
    category: "Entertainment",
    cat: "violet",
    amount: 14.95,
    cadence: "mo",
    next: "—",
    status: "paused",
    history: [["Apr 22", 14.95], ["Mar 22", 14.95]]
  }, {
    id: "hbo",
    name: "Max",
    color: "#0046FF",
    category: "Entertainment",
    cat: "violet",
    amount: 15.99,
    cadence: "mo",
    next: "Jul 14",
    status: "pending",
    cancelledOn: "Jun 20",
    history: [["Jun 14", 15.99], ["May 14", 15.99], ["Apr 14", 15.99]]
  }, {
    id: "hulu",
    name: "Hulu",
    color: "#1CE783",
    category: "Entertainment",
    cat: "violet",
    amount: 7.99,
    cadence: "mo",
    next: "—",
    status: "cancelled",
    cancelledOn: "May 30",
    history: [["May 16", 7.99], ["Apr 16", 7.99], ["Mar 16", 7.99]]
  }, {
    id: "adobe",
    name: "Adobe CC",
    color: "#FF0000",
    category: "Productivity",
    cat: "blue",
    amount: 54.99,
    cadence: "mo",
    next: "Jul 8",
    status: "attention",
    cancelledOn: "Jun 8",
    history: [["Jul 08", 54.99], ["Jun 08", 54.99], ["May 08", 54.99]]
  }],
  categories: [{
    category: "Entertainment",
    cat: "violet",
    spent: 45.97
  }, {
    category: "Productivity",
    cat: "blue",
    spent: 32.00
  }, {
    category: "Music",
    cat: "coral",
    spent: 10.99
  }, {
    category: "Utilities",
    cat: "amber",
    spent: 2.99
  }],
  trend: [["Jan", 58.95], ["Feb", 61.94], ["Mar", 61.94], ["Apr", 73.94], ["May", 78.96], ["Jun", 91.96]],
  insights: [{
    id: "unused",
    icon: "moon",
    title: "Figma looks unused",
    body: "No activity in 60 days · $12.00/mo",
    save: 144
  }, {
    id: "annual",
    icon: "calendar",
    title: "Switch Spotify to annual",
    body: "Save ~16% paying yearly",
    save: 21
  }, {
    id: "dupe",
    icon: "copy",
    title: "Two video services overlap",
    body: "Netflix + Max — keep one?",
    save: 192
  }],
  freeLimit: 8,
  catalog: ["Netflix", "Spotify", "YouTube Premium", "Disney+", "ChatGPT Plus", "Notion", "iCloud+", "Figma", "Amazon Prime", "Hulu", "Max", "Audible", "Dropbox", "Adobe CC", "Headspace", "Duolingo", "NordVPN", "Patreon", "Twitch", "Apple Music"]
};

// Active = anything currently billing (active/trial). Used for "monthly total".
window.ZENO.activeSubs = window.ZENO.subscriptions.filter(s => s.status === "active");
window.ZENO.monthlyTotal = window.ZENO.activeSubs.reduce((a, s) => a + s.amount, 0);
window.ZENO.trackedCount = window.ZENO.subscriptions.filter(s => ["active", "trial", "paused", "pending", "attention"].includes(s.status)).length;

/* ---- Budgeting ----
   committed   = recurring spend already charged this month (from renewal dates passed)
   projected   = forecast month-end recurring spend (committed + remaining renewals + trial conversions)
   The forward-looking status compares PROJECTED to the cap, not committed-so-far. */
window.ZENO.budget = {
  cap: 80,
  // user's monthly recurring budget; null = not set yet
  committed: 49.97,
  // charged so far this month (Netflix, Spotify, ChatGPT, iCloud renewed)
  projected: 75.96,
  // forecast month-end (adds Figma $12 + Disney trial $13.99 converting)
  income: null,
  // optional monthly income; null = not entered
  // forecast: remaining renewals between now and month-end
  remaining: [{
    id: "figma",
    name: "Figma",
    amount: 12.00,
    day: "Jul 9",
    color: "#A259FF"
  }, {
    id: "disney",
    name: "Disney+",
    amount: 13.99,
    day: "Jul 12",
    color: "#113CCF",
    note: "trial converts"
  }],
  categoryCaps: [{
    category: "Entertainment",
    cat: "violet",
    cap: 35,
    committed: 29.98,
    imported: 14.00
  }, {
    category: "Productivity",
    cat: "blue",
    cap: 35,
    committed: 32.00,
    imported: 0
  }, {
    category: "Music",
    cat: "coral",
    cap: 15,
    committed: 10.99,
    imported: 0
  }, {
    category: "Utilities",
    cat: "amber",
    cap: 10,
    committed: 2.99,
    imported: 0
  }],
  envelopes: [{
    id: "dining",
    name: "Dining out",
    icon: "utensils",
    funded: 200,
    spent: 145
  }, {
    id: "coffee",
    name: "Coffee",
    icon: "coffee",
    funded: 60,
    spent: 38
  }, {
    id: "rides",
    name: "Rideshare",
    icon: "car-front",
    funded: 80,
    spent: 81
  }],
  lastImport: "Jun 14",
  // freshness for CSV-enriched category spend; null = never imported
  daysLeftInMonth: 9,
  recap: {
    month: "May",
    cap: 80,
    actual: 74.20,
    prevActual: 79.40,
    streak: 3
  },
  trend: [["Feb", 61.94], ["Mar", 61.94], ["Apr", 73.94], ["May", 74.20], ["Jun", 78.96], ["Jul", 75.96]]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/data.js", error: String((e && e.message) || e) }); }

__ds_ns.AmountDisplay = __ds_scope.AmountDisplay;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CategoryTag = __ds_scope.CategoryTag;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.ListRow = __ds_scope.ListRow;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.ServiceAvatar = __ds_scope.ServiceAvatar;

__ds_ns.Switch = __ds_scope.Switch;

})();
