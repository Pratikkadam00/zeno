/* @ds-bundle: {"format":4,"namespace":"ZenoDesignSystem_12971a","components":[{"name":"AmountDisplay","sourcePath":"components/core/AmountDisplay.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"CategoryTag","sourcePath":"components/core/CategoryTag.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"ListRow","sourcePath":"components/core/ListRow.jsx"},{"name":"ProgressBar","sourcePath":"components/core/ProgressBar.jsx"},{"name":"SegmentedControl","sourcePath":"components/core/SegmentedControl.jsx"},{"name":"ServiceAvatar","sourcePath":"components/core/ServiceAvatar.jsx"},{"name":"Switch","sourcePath":"components/core/Switch.jsx"}],"sourceHashes":{"components/core/AmountDisplay.jsx":"de3965052ce1","components/core/Badge.jsx":"0f8918d18afc","components/core/Button.jsx":"5666cd5adb8c","components/core/Card.jsx":"9d94dd84555e","components/core/CategoryTag.jsx":"9961526a7a31","components/core/Icon.jsx":"3c10804cd886","components/core/IconButton.jsx":"009df706edb3","components/core/Input.jsx":"e16e4a18f1eb","components/core/ListRow.jsx":"8b12c8298acc","components/core/ProgressBar.jsx":"054e8ce3fffe","components/core/SegmentedControl.jsx":"78e579f2fc0a","components/core/ServiceAvatar.jsx":"65891a22381b","components/core/Switch.jsx":"4b6eae1dbd19","ui_kits/app/AddSubscriptionScreen.jsx":"49b14763f85c","ui_kits/app/BudgetRecapScreen.jsx":"f894cc15c512","ui_kits/app/BudgetScreen.jsx":"6b9db97ed9b4","ui_kits/app/CalendarScreen.jsx":"26074ee2c9b9","ui_kits/app/CancelFlowScreen.jsx":"de452c69f9d5","ui_kits/app/Chrome.jsx":"1a059a457f14","ui_kits/app/CoachScreen.jsx":"b8e13d83b178","ui_kits/app/DiscoverScreen.jsx":"ef1bcc8602dc","ui_kits/app/FamilyScreen.jsx":"78598e20c649","ui_kits/app/HomeScreen.jsx":"48ab4cec0475","ui_kits/app/InsightsScreen.jsx":"3738a04b4418","ui_kits/app/Ledger.jsx":"4a4d94029e2f","ui_kits/app/OnboardingScreen.jsx":"159d3aa68a35","ui_kits/app/PaywallScreen.jsx":"c7e016ed37df","ui_kits/app/SettingsScreen.jsx":"c2f810fe7e99","ui_kits/app/SubscriptionDetailScreen.jsx":"e0f4352a5119","ui_kits/app/SubscriptionsScreen.jsx":"5e154b81fd3e","ui_kits/app/data.js":"e5cfa79a0162"},"inlinedExternals":[],"unexposedExports":[]} */

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
 * Zeno Badge — ledger tick-tag. Caps-mono micro text with a colored status
 * tick, no pill chrome (identical pills everywhere is banned). `solid`
 * renders an inverse ink chip for the rare urgent tag.
 */
function Badge({
  tone = "neutral",
  solid = false,
  dot = false,
  hollow = false,
  children,
  style,
  ...rest
}) {
  const tones = {
    neutral: {
      text: "var(--text-tertiary)",
      tick: "var(--ink-300)"
    },
    accent: {
      text: "var(--accent-text)",
      tick: "var(--accent)"
    },
    success: {
      text: "var(--stamp-verified)",
      tick: "var(--stamp-verified)"
    },
    warning: {
      text: "#A36A0B",
      tick: "var(--warning)"
    },
    danger: {
      text: "var(--stamp-alert)",
      tick: "var(--stamp-alert)"
    },
    info: {
      text: "var(--info)",
      tick: "var(--info)"
    },
    pro: {
      text: "var(--text-secondary)",
      tick: "var(--ink-400)"
    }
  };
  const t = tones[tone] || tones.neutral;
  if (solid) {
    return /*#__PURE__*/React.createElement("span", _extends({
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 20,
        padding: "0 8px",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--paper)",
        background: tone === "danger" ? "var(--stamp-alert)" : "var(--ink-panel)",
        borderRadius: 4,
        whiteSpace: "nowrap",
        ...style
      }
    }, rest), children);
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "var(--font-mono)",
      fontSize: 9.5,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: t.text,
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 3,
      background: hollow ? "transparent" : t.tick,
      border: hollow ? `1px solid ${t.tick}` : "none",
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
      bg: "var(--ink-panel)",
      bgHover: "var(--ink-800)",
      bgActive: "var(--ink-700)",
      color: "var(--paper)",
      border: "transparent",
      shadow: "var(--shadow-xs)"
    },
    money: {
      // money-positive action — the only green button
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
      shadow: "none"
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
      // outlined red — real alerts only, never solid panic
      bg: hover ? "var(--danger-soft)" : "var(--surface-card)",
      bgHover: "var(--danger-soft)",
      bgActive: "var(--danger-soft)",
      color: "var(--danger)",
      border: "color-mix(in srgb, var(--danger) 45%, transparent)",
      shadow: "none"
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
      transform: active && !disabled ? "translateY(0.5px) scale(0.97)" : "none",
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
      border: `1px solid ${hover ? "var(--border-default)" : "var(--rule)"}`,
      borderRadius: "var(--radius-md)",
      padding: pads[padding],
      boxShadow: elevated ? "var(--shadow-sm)" : "none",
      transform: hover ? "translateY(-1px)" : "none",
      transition: "border-color var(--dur-fast) var(--ease-out), transform var(--dur) var(--ease-out)",
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
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 14px",
      minHeight: 44,
      background: clickable && hover ? "var(--surface-sunken)" : "transparent",
      borderBottom: divider ? "1px solid var(--rule)" : "none",
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
      flex: "none",
      minWidth: 0,
      maxWidth: "58%"
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
      fontSize: 11,
      fontFamily: "var(--font-mono)",
      letterSpacing: "0.02em",
      color: "var(--text-tertiary)",
      marginTop: 2,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, subtitle)), leader && (amount != null || trailing != null) ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      flex: 1,
      borderBottom: "2px dotted var(--rule-strong)",
      transform: "translateY(3px)",
      minWidth: 12
    }
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), trailing != null ? /*#__PURE__*/React.createElement("span", {
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
      letterSpacing: "var(--ls-snug)",
      fontFeatureSettings: "'tnum' 1"
    }
  }, amount), cadence && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      color: "var(--text-tertiary)",
      marginTop: 1
    }
  }, "/", cadence)) : null, chevron && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 16,
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
/* Zeno — Add subscription (ledger restyle, editable renewal date kept).
   SLOP AUDIT — ① Zeno: caps section heads, rule-framed date stepper.
   ② Tempted by: chip-grid overload → text ticks. ③ Lazy: long form card. */
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
  const [days, setDays] = React.useState(14);
  const renewalLabel = () => {
    const d = new Date(2026, 6, 10);
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  };
  return /*#__PURE__*/React.createElement(Sheet, {
    title: "NEW ENTRY",
    onClose: onClose,
    footer: /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: onClose
    }, "Write it in")
  }, /*#__PURE__*/React.createElement(SectionHead, {
    pad: "8px 0 10px"
  }, "From the catalog \xB7 600+"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 8,
      marginBottom: 16
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
        background: on ? "var(--surface-card)" : "none",
        border: `1px solid ${on ? "var(--ink-400)" : "var(--rule)"}`,
        borderRadius: "var(--radius-sm)",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement(ServiceAvatar, {
      name: p.name,
      color: p.color,
      size: 34
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        letterSpacing: "0.04em",
        color: on ? "var(--text-primary)" : "var(--text-tertiary)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: "100%"
      }
    }, p.name.toUpperCase()));
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
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionHead, {
    pad: "0 0 8px"
  }, "Billing cycle"), /*#__PURE__*/React.createElement(SegmentedControl, {
    options: ["Monthly", "Yearly"],
    value: cadence,
    onChange: setCadence
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionHead, {
    pad: "4px 0 8px"
  }, "Next renews \u2014 you set it"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      border: "1px solid var(--rule-strong)",
      borderRadius: "var(--radius-sm)",
      padding: "10px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 700,
      fontSize: 15
    }
  }, renewalLabel()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 9.5,
      letterSpacing: "0.1em",
      color: "var(--text-tertiary)",
      marginTop: 2
    }
  }, "IN ", days, " DAY", days === 1 ? "" : "S")), /*#__PURE__*/React.createElement(IconButton, {
    variant: "secondary",
    size: 36,
    label: "Earlier",
    onClick: () => setDays(d => Math.max(0, d - 1))
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "minus",
    size: 15
  })), /*#__PURE__*/React.createElement(IconButton, {
    variant: "secondary",
    size: 36,
    label: "Later",
    onClick: () => setDays(d => d + 1)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginTop: 8
    }
  }, [["TMRW", 1], ["1 WK", 7], ["2 WK", 14], ["1 MO", 30]].map(([lbl, d]) => /*#__PURE__*/React.createElement("button", {
    key: lbl,
    onClick: () => setDays(d),
    style: {
      flex: 1,
      height: 30,
      border: "none",
      borderBottom: `2px solid ${days === d ? "var(--accent)" : "var(--rule)"}`,
      background: "none",
      color: days === d ? "var(--text-primary)" : "var(--text-tertiary)",
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.1em",
      cursor: "pointer"
    }
  }, lbl)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionHead, {
    pad: "4px 0 8px"
  }, "Category"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "4px 16px"
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
        background: "none",
        border: "none",
        borderBottom: `2px solid ${on ? `var(--cat-${c})` : "transparent"}`,
        cursor: "pointer",
        padding: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 3,
        background: `var(--cat-${c})`
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: on ? 700 : 500,
        letterSpacing: "0.08em",
        color: on ? "var(--text-primary)" : "var(--text-secondary)"
      }
    }, name.toUpperCase()));
  }))), /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Remind me",
    sub: "7D \xB7 3D \xB7 DAY OF",
    value: /*#__PURE__*/React.createElement(Switch, {
      checked: remind,
      onChange: setRemind,
      size: "sm"
    })
  })));
}
window.AddSubscriptionScreen = AddSubscriptionScreen;
window.Label = function Label({
  children
}) {
  return /*#__PURE__*/React.createElement(SectionHead, {
    pad: "0 0 8px"
  }, children);
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AddSubscriptionScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/BudgetRecapScreen.jsx
try { (() => {
/* Zeno — Budget recap: the month, stamped. Streak = tally marks.
   SLOP AUDIT — ① Zeno: stamp verdict + tally-mark streak + cap rule on the
   trend. ② Tempted by: confetti "you did it!" → the stamp is the celebration.
   ③ Lazy: green banner + bar chart card. */
function BudgetRecapScreen({
  onClose
}) {
  const B = window.ZENO.budget;
  const r = B.recap;
  const under = r.actual <= r.cap;
  const diff = Math.abs(r.cap - r.actual);
  const max = Math.max(...B.trend.map(t => t[1]), r.cap);
  return /*#__PURE__*/React.createElement(Sheet, {
    title: "MAY \u2014 CLOSED",
    onClose: onClose,
    footer: /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: onClose
    }, "Done")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "34px 0 6px"
    }
  }, /*#__PURE__*/React.createElement(Stamp, {
    animate: true,
    size: "lg",
    angle: -5,
    tone: under ? "verified" : "alert",
    sub: `CAP $${r.cap} · SPENT $${r.actual.toFixed(2)}`
  }, under ? "Under budget" : "Over budget")), under && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      margin: "20px 0 4px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: 3,
      alignItems: "flex-end"
    }
  }, Array.from({
    length: r.streak
  }, (_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 3,
      height: 18,
      background: "var(--stamp-verified)",
      transform: i === 3 ? "rotate(-24deg) translateX(-7px)" : "none"
    }
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.14em",
      color: "var(--text-secondary)"
    }
  }, r.streak, " MONTHS RUNNING")), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--rule-strong)",
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement(LedgerLine, {
    label: "The cap",
    value: `$${r.cap.toFixed(2)}`
  }), /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Actually spent",
    strong: true,
    value: `$${r.actual.toFixed(2)}`,
    valueColor: under ? "var(--stamp-verified)" : "var(--stamp-alert)"
  }), /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Margin",
    value: `${under ? "−" : "+"}$${diff.toFixed(2)}`
  }), /*#__PURE__*/React.createElement(LedgerLine, {
    label: "vs April",
    value: `${r.actual < r.prevActual ? "▼" : "▲"} $${Math.abs(r.actual - r.prevActual).toFixed(2)}`
  })), /*#__PURE__*/React.createElement(SectionHead, {
    pad: "20px 0 10px"
  }, "Six months vs the cap"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "flex-end",
      gap: 8,
      height: 92,
      paddingTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      top: `${6 + (1 - r.cap / max) * 80}px`,
      borderTop: "2px dashed var(--ink-400)",
      zIndex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      right: 0,
      top: -14,
      fontFamily: "var(--font-mono)",
      fontSize: 8.5,
      letterSpacing: "0.1em",
      color: "var(--text-tertiary)"
    }
  }, "CAP $", r.cap)), B.trend.map(([m, v]) => /*#__PURE__*/React.createElement("div", {
    key: m,
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 24,
      height: `${v / max * 80}px`,
      background: v > r.cap ? "var(--stamp-alert)" : "var(--rule-strong)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 8.5,
      letterSpacing: "0.1em",
      color: "var(--text-tertiary)"
    }
  }, m.toUpperCase())))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1.5px solid var(--rule-strong)"
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      color: "var(--text-tertiary)",
      marginTop: 14
    }
  }, "Every closed month is stamped into your Year in Review."));
}
window.BudgetRecapScreen = BudgetRecapScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/BudgetRecapScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/BudgetScreen.jsx
try { (() => {
/* Zeno — Budget: forecast-first. Free = one monthly cap. Category budgets +
   envelopes are Pro-locked rows that route to the paywall (the only true gates).
   SLOP AUDIT — ① Zeno: forecast as a running ledger with a cap rule drawn
   across the bar; status is a stamp-chip. ② Tempted by: dark hero card +
   progress ring → typographic block + two-tone rule bar. ③ Lazy: donut +
   three stat cards + locked-feature modal. */
function BudgetScreen({
  onBack,
  onCancelSub,
  onUpgrade,
  onImport,
  onRecap,
  onCoach
}) {
  const B = window.ZENO.budget;
  const [cap, setCap] = React.useState(B.cap);
  const [setupCap, setSetupCap] = React.useState(80);
  const committed = B.committed,
    projected = B.projected;
  if (cap == null) {
    const suggested = Math.ceil(projected / 5) * 5;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement(ScreenHeader, {
      title: "SET A CAP",
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
        padding: "8px 20px 20px"
      }
    }, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 25,
        letterSpacing: "-0.02em",
        margin: "6px 0 8px"
      }
    }, "Draw the line"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        color: "var(--text-secondary)",
        lineHeight: 1.55,
        margin: "0 0 18px"
      }
    }, "Zeno already knows your renewals, so the forecast works with zero setup \u2014 no import, no bank login required."), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: "1px solid var(--rule-strong)"
      }
    }, /*#__PURE__*/React.createElement(LedgerLine, {
      label: "Charged so far",
      value: `$${committed.toFixed(2)}`
    }), /*#__PURE__*/React.createElement(LedgerLine, {
      label: "Still to renew",
      value: `$${(projected - committed).toFixed(2)}`
    }), /*#__PURE__*/React.createElement(LedgerLine, {
      label: "Forecast month-end",
      strong: true,
      value: `$${projected.toFixed(2)}`
    })), /*#__PURE__*/React.createElement(SectionHead, {
      pad: "22px 0 10px"
    }, "Your monthly cap"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        margin: "6px 0 10px"
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      variant: "secondary",
      size: 44,
      label: "Lower",
      onClick: () => setSetupCap(c => Math.max(5, c - 5))
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "minus",
      size: 19
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: 44,
        letterSpacing: "-0.03em",
        fontFeatureSettings: "'tnum' 1",
        minWidth: 128,
        textAlign: "center"
      }
    }, "$", setupCap), /*#__PURE__*/React.createElement(IconButton, {
      variant: "secondary",
      size: 44,
      label: "Raise",
      onClick: () => setSetupCap(c => c + 5)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 19
    }))), /*#__PURE__*/React.createElement("button", {
      onClick: () => setSetupCap(suggested),
      style: {
        display: "block",
        margin: "0 auto",
        background: "none",
        border: "none",
        color: "var(--accent-text)",
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.12em",
        cursor: "pointer",
        padding: 8
      }
    }, "SUGGESTED \xB7 $", suggested), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12.5,
        color: "var(--text-tertiary)",
        textAlign: "center",
        margin: "4px 0 0"
      }
    }, setupCap < projected ? `Below your forecast — we'll warn you before the charge that crosses it.` : `$${(setupCap - projected).toFixed(0)} of headroom over the forecast.`)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: "none",
        padding: "12px 20px 28px",
        borderTop: "1px solid var(--rule-strong)",
        background: "var(--surface-card)"
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: () => setCap(setupCap)
    }, "Track this budget")));
  }
  const pct = Math.min(100, projected / cap * 100);
  const committedPct = Math.min(100, committed / cap * 100);
  const over = projected > cap;
  const approaching = !over && projected > 0.85 * cap;
  const headroom = cap - projected;
  const stColor = over ? "var(--stamp-alert)" : approaching ? "#A36A0B" : "var(--stamp-verified)";
  const candidates = window.ZENO.subscriptions.filter(s => s.status === "active").sort((a, b) => (b.unused ? 1 : 0) - (a.unused ? 1 : 0) || a.amount - b.amount).slice(0, 3);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      overflowX: "hidden",
      paddingBottom: 24
    }
  }, /*#__PURE__*/React.createElement(ScreenHeader, {
    title: "BUDGET",
    left: /*#__PURE__*/React.createElement(IconButton, {
      label: "Back",
      onClick: onBack
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-left",
      size: 24
    })),
    right: /*#__PURE__*/React.createElement(IconButton, {
      label: "Edit cap",
      onClick: () => setCap(null)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "pencil-line",
      size: 19
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 20px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.16em",
      color: "var(--text-tertiary)"
    }
  }, "FORECAST \xB7 ", B.daysLeftInMonth, " DAYS LEFT"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 7,
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: 44,
      lineHeight: 1,
      letterSpacing: "-0.035em",
      fontFeatureSettings: "'tnum' 1"
    }
  }, "$", projected.toFixed(2)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      color: "var(--text-tertiary)"
    }
  }, "/ $", cap))), /*#__PURE__*/React.createElement(Stamp, {
    size: "sm",
    angle: 4,
    tone: over ? "alert" : approaching ? "neutral" : "verified"
  }, over ? "Over" : approaching ? "Close" : "On pace")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      height: 6,
      background: "var(--surface-sunken)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${committedPct}%`,
      background: stColor
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${pct - committedPct}%`,
      background: stColor,
      opacity: 0.38
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: -4,
      bottom: -4,
      left: "100%",
      width: 2,
      background: "var(--ink-panel)",
      transform: "translateX(-2px)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 7,
      fontFamily: "var(--font-mono)",
      fontSize: 9.5,
      letterSpacing: "0.08em",
      color: "var(--text-tertiary)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "$", committed.toFixed(2), " CHARGED"), /*#__PURE__*/React.createElement("span", null, over ? `$${Math.abs(headroom).toFixed(2)} OVER CAP` : `$${headroom.toFixed(2)} HEADROOM`)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      color: "var(--text-tertiary)",
      marginTop: 8
    }
  }, "Forecast from your renewal dates \u2014 no bank feed, none needed.")), (over || approaching) && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SectionHead, null, over ? `Cut $${Math.abs(headroom).toFixed(2)} to get back under` : "Trim now to stay under"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px"
    }
  }, candidates.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    className: "zn-print",
    style: {
      animationDelay: `${i * 45}ms`,
      display: "flex",
      alignItems: "center",
      gap: 11,
      padding: "10px 0",
      borderBottom: "1px solid var(--rule)"
    }
  }, /*#__PURE__*/React.createElement(ServiceAvatar, {
    name: s.name,
    color: s.color,
    size: 34
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-sans)",
      fontWeight: 650,
      fontSize: 14
    }
  }, s.name, s.unused && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 8.5,
      letterSpacing: "0.12em",
      color: "#A36A0B",
      marginLeft: 8
    }
  }, "UNUSED 60D")), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      color: "var(--text-tertiary)",
      marginTop: 2
    }
  }, "$", s.amount.toFixed(2), "/MO \xB7 $", (s.amount * 12).toFixed(0), "/YR")), /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    size: "sm",
    onClick: () => onCancelSub(s.id)
  }, "Cancel"))), /*#__PURE__*/React.createElement("div", {
    onClick: onCoach,
    style: {
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Ask the Spend Coach",
    sub: "FREE",
    value: "\u2197",
    valueColor: "var(--accent-text)"
  })))), /*#__PURE__*/React.createElement(SectionHead, null, "Still to renew"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px"
    }
  }, B.remaining.map((r, i) => {
    const run = committed + B.remaining.slice(0, i + 1).reduce((a, x) => a + x.amount, 0);
    return /*#__PURE__*/React.createElement(LedgerLine, {
      key: r.id,
      label: r.name,
      sub: `${r.day.toUpperCase()}${r.note ? " · " + r.note.toUpperCase() : ""}`,
      value: `+$${r.amount.toFixed(2)} → $${run.toFixed(2)}`
    });
  })), /*#__PURE__*/React.createElement(SectionHead, null, "Pro budgeting"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px"
    }
  }, [["chart-pie", "Category budgets", "A CAP PER CATEGORY"], ["wallet", "Envelope budgeting", "FUND & LOG BY HAND — NO IMPORT NEEDED"]].map(([ic, t, sub]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    onClick: onUpgrade,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "13px 0",
      borderBottom: "1px solid var(--rule)",
      cursor: "pointer",
      minHeight: 48
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 18,
    color: "var(--text-tertiary)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-sans)",
      fontWeight: 650,
      fontSize: 14.5,
      color: "var(--text-primary)"
    }
  }, t), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      letterSpacing: "0.1em",
      color: "var(--text-tertiary)",
      marginTop: 2
    }
  }, sub)), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.12em",
      color: "var(--text-secondary)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 12,
    color: "var(--text-tertiary)"
  }), " PRO"))), /*#__PURE__*/React.createElement("div", {
    onClick: onImport,
    style: {
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Imported spend",
    sub: `AS OF ${B.lastImport.toUpperCase()} · 26 DAYS AGO`,
    value: "REFRESH \u2197",
    valueColor: "var(--accent-text)"
  }))), /*#__PURE__*/React.createElement(SectionHead, null, "History"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onRecap,
    style: {
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(LedgerLine, {
    label: "May recap",
    sub: `STREAK ×${B.recap.streak}`,
    value: `UNDER BY $${(B.recap.cap - B.recap.actual).toFixed(2)}`,
    valueColor: "var(--stamp-verified)"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "22px 20px 0",
      padding: "12px 14px",
      border: "1px dashed var(--rule-strong)",
      borderRadius: "var(--radius-md)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 9.5,
      letterSpacing: "0.14em",
      color: "var(--text-tertiary)",
      marginBottom: 8
    }
  }, "DEMO \xB7 PREVIEW STATES"), /*#__PURE__*/React.createElement("div", {
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
  }, "Close"), /*#__PURE__*/React.createElement(Button, {
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
  }, "Unset"))));
}
window.BudgetScreen = BudgetScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/BudgetScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/CalendarScreen.jsx
try { (() => {
/* Zeno — Calendar: the renewal register. Month grid with renewal ticks
   (solid=renewal, hollow=trial, red=hike), day rows grouped by week.
   SLOP AUDIT — ① Zeno: tick marks under dates (not dots), ledger rows with
   date column, caps week heads. ② Tempted by: stat-card trio → one ledger
   summary block. ③ Lazy: dots-on-calendar + card list. */
function CalendarScreen({
  onOpen
}) {
  const Z = window.ZENO;
  const subs = Z.subscriptions.filter(s => ["active", "trial"].includes(s.status));
  const [sel, setSel] = React.useState(null);
  // July 2026: 1st = Wednesday. Renewal days from data (Jul only).
  const marks = {}; // day → [{type}]
  subs.forEach(s => {
    const m = /Jul (\d+)/.exec(s.next);
    if (m) (marks[+m[1]] = marks[+m[1]] || []).push(s.status === "trial" ? "trial" : s.priceHike ? "hike" : "renew");
  });
  const monthTotal = subs.reduce((a, s) => a + s.amount, 0);
  const week = subs.filter(s => {
    const m = /Jul (\d+)/.exec(s.next);
    return m && +m[1] <= 17;
  });
  const weekTotal = week.reduce((a, s) => a + s.amount, 0);
  const tickColor = {
    renew: "var(--text-secondary)",
    trial: "var(--warning)",
    hike: "var(--stamp-alert)"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      overflowX: "hidden",
      paddingBottom: 24
    }
  }, /*#__PURE__*/React.createElement(Masthead, {
    kicker: "RENEWAL REGISTER",
    title: "July 2026",
    right: /*#__PURE__*/React.createElement(IconButton, {
      label: "Filter"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "sliders-horizontal",
      size: 19
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 20px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      gap: 2
    }
  }, ["M", "T", "W", "T", "F", "S", "S"].map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      textAlign: "center",
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.1em",
      color: "var(--text-tertiary)",
      paddingBottom: 6
    }
  }, d)), Array.from({
    length: 35
  }, (_, i) => {
    const day = i - 1; // Jul 1 = Wednesday → index 2
    const valid = day >= 1 && day <= 31;
    const today = day === 10;
    const dayMarks = marks[day] || [];
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: () => valid && dayMarks.length && setSel(day),
      style: {
        height: 44,
        background: today ? "var(--text-primary)" : "none",
        border: sel === day ? "1.5px solid var(--accent)" : "1px solid transparent",
        borderRadius: 6,
        cursor: valid && dayMarks.length ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3
      }
    }, valid && /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 12.5,
        fontWeight: today ? 700 : 500,
        color: today ? "var(--bg-app)" : "var(--text-primary)",
        fontFeatureSettings: "'tnum' 1"
      }
    }, day), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        gap: 2,
        height: 3
      }
    }, dayMarks.slice(0, 3).map((t, j) => /*#__PURE__*/React.createElement("span", {
      key: j,
      style: {
        width: 8,
        height: 3,
        background: t === "trial" ? "transparent" : tickColor[t],
        border: t === "trial" ? `1px solid ${tickColor[t]}` : "none"
      }
    }))));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 16,
      marginTop: 10,
      paddingBottom: 12,
      borderBottom: "1px solid var(--rule-strong)"
    }
  }, [["renew", "RENEWAL"], ["trial", "TRIAL ENDS"], ["hike", "PRICE ROSE"]].map(([t, l]) => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontFamily: "var(--font-mono)",
      fontSize: 8.5,
      letterSpacing: "0.12em",
      color: "var(--text-tertiary)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 3,
      background: t === "trial" ? "transparent" : tickColor[t],
      border: t === "trial" ? `1px solid ${tickColor[t]}` : "none"
    }
  }), l))), /*#__PURE__*/React.createElement(LedgerLine, {
    label: "This month",
    value: `$${monthTotal.toFixed(2)}`
  }), /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Next 7 days",
    sub: `${week.length} RENEWALS`,
    value: `$${weekTotal.toFixed(2)}`
  }), /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Projected year",
    value: `$${(monthTotal * 12).toFixed(0)}`
  })), /*#__PURE__*/React.createElement(SectionHead, null, sel ? `July ${sel}` : "Coming up"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 6px"
    }
  }, (sel ? subs.filter(s => new RegExp(`Jul ${sel}$`).test(s.next)) : subs).map((s, i, arr) => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    className: "zn-print",
    style: {
      animationDelay: `${i * 45}ms`
    }
  }, /*#__PURE__*/React.createElement(ListRow, {
    divider: i < arr.length - 1,
    leading: /*#__PURE__*/React.createElement("span", {
      style: {
        width: 40,
        textAlign: "center",
        flex: "none"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block",
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: 16,
        color: "var(--text-primary)",
        lineHeight: 1
      }
    }, (/\d+/.exec(s.next) || ["—"])[0]), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block",
        fontFamily: "var(--font-mono)",
        fontSize: 8.5,
        letterSpacing: "0.14em",
        color: "var(--text-tertiary)",
        marginTop: 2
      }
    }, "JUL")),
    title: s.name,
    subtitle: s.status === "trial" ? "TRIAL → PAID" : s.category.toUpperCase(),
    amount: `$${s.amount.toFixed(2)}`,
    onClick: () => onOpen(s.id)
  })))));
}
window.CalendarScreen = CalendarScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/CalendarScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/CancelFlowScreen.jsx
try { (() => {
/* Zeno — Cancel + verification. The Stamp is THE celebration of the app
   (the one big moment — no confetti anywhere).
   SLOP AUDIT — ① Zeno: difficulty as ink ticks; "AWAITING PROOF" watermark;
   verified = stamp thunk + savings printed as receipt lines. ② Tempted by:
   confetti + green check circle → the stamp IS the celebration. ③ Lazy version:
   modal with "Are you sure?" and a party popper.
   MOTION: stamp zn-stamp (RN: spring d14 s420 + Haptics Success);
   savings lines print in after the stamp (300ms delay, 45ms stagger). */
function CancelFlowScreen({
  id,
  onClose,
  onDone
}) {
  const s = window.ZENO.subscriptions.find(x => x.id === id) || window.ZENO.subscriptions[0];
  const yearly = (s.amount * 12).toFixed(2);
  const [stage, setStage] = React.useState("guided");
  const diff = s.id === "adobe" ? ["HARD", 3] : s.id === "hbo" ? ["MEDIUM", 2] : ["EASY", 1];
  const diffColor = diff[1] === 3 ? "var(--stamp-alert)" : diff[1] === 2 ? "var(--warning)" : "var(--stamp-verified)";
  const steps = [`Sign in to ${s.name} in a browser`, "Open Account → Subscription or Plan", "Choose Cancel and confirm", "Keep the confirmation email"];
  if (stage === "guided") {
    return /*#__PURE__*/React.createElement(Sheet, {
      title: `CANCEL ${s.name.toUpperCase()}`,
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
        alignItems: "baseline",
        justifyContent: "space-between",
        padding: "6px 0 10px",
        borderBottom: "1px solid var(--rule-strong)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.16em",
        color: "var(--text-tertiary)"
      }
    }, "DIFFICULTY"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        gap: 3
      }
    }, [1, 2, 3].map(n => /*#__PURE__*/React.createElement("span", {
      key: n,
      style: {
        width: 14,
        height: 4,
        background: n <= diff[1] ? diffColor : "var(--rule-strong)"
      }
    }))), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        fontWeight: 700,
        color: diffColor,
        letterSpacing: "0.1em"
      }
    }, diff[0]))), steps.map((st, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "zn-print",
      style: {
        animationDelay: `${i * 60}ms`,
        display: "flex",
        gap: 14,
        alignItems: "baseline",
        padding: "13px 0",
        borderBottom: "1px solid var(--rule)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        fontWeight: 700,
        color: "var(--text-tertiary)"
      }
    }, String(i + 1).padStart(2, "0")), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 14.5,
        color: "var(--text-primary)",
        lineHeight: 1.45
      }
    }, st))), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "lg",
      fullWidth: true,
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "external-link",
        size: 17
      }),
      style: {
        marginTop: 18
      }
    }, `Open ${s.name}'s cancellation page`), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12.5,
        color: "var(--text-tertiary)",
        lineHeight: 1.5,
        marginTop: 14
      }
    }, "Zeno won't mark this cancelled until the next receipt or statement shows the charge actually stopped."));
  }
  if (stage === "pending") {
    return /*#__PURE__*/React.createElement(Sheet, {
      title: "AWAITING PROOF",
      onClose: onDone
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        padding: "26px 0 6px",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: 34,
        letterSpacing: "0.18em",
        color: "var(--text-primary)",
        opacity: 0.05,
        transform: "rotate(-12deg)",
        whiteSpace: "nowrap"
      }
    }, "AWAITING PROOF")), /*#__PURE__*/React.createElement(Stamp, {
      tone: "neutral",
      angle: -4,
      sub: `REPORTED ${"JUL 10"}`
    }, "Pending")), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 14.5,
        color: "var(--text-secondary)",
        lineHeight: 1.55,
        textAlign: "center",
        margin: "18px auto 22px",
        maxWidth: "32ch"
      }
    }, s.name, " is marked pending. Around ", s.next, ", Zeno re-checks your receipts and statement for a charge \u2014 then stamps it, one way or the other."), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: "1px solid var(--rule-strong)"
      }
    }, [["Cancellation reported", "JUL 10", true], ["Re-check next receipt", `~${s.next.toUpperCase()}`, false], ["Stamp the outcome", "", false]].map(([t, d, done], i) => /*#__PURE__*/React.createElement(LedgerLine, {
      key: i,
      label: /*#__PURE__*/React.createElement("span", {
        style: {
          color: done ? "var(--text-primary)" : "var(--text-tertiary)",
          fontWeight: done ? 650 : 500
        }
      }, t),
      value: done ? /*#__PURE__*/React.createElement(Icon, {
        name: "check",
        size: 15,
        color: "var(--stamp-verified)"
      }) : /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          color: "var(--text-tertiary)"
        }
      }, d)
    }))), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: onDone,
      style: {
        marginTop: 20
      }
    }, "Got it"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 22,
        padding: "12px 14px",
        border: "1px dashed var(--rule-strong)",
        borderRadius: "var(--radius-md)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        letterSpacing: "0.14em",
        color: "var(--text-tertiary)",
        marginBottom: 8
      }
    }, "DEMO \xB7 PREVIEW THE OUTCOME"), /*#__PURE__*/React.createElement("div", {
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
    }, "No charge found"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      onClick: () => setStage("charged"),
      style: {
        flex: 1
      }
    }, "Charged again"))));
  }
  if (stage === "verified") {
    return /*#__PURE__*/React.createElement(Sheet, {
      title: "",
      onClose: onDone,
      footer: /*#__PURE__*/React.createElement(Button, {
        variant: "money",
        size: "lg",
        fullWidth: true,
        onClick: onDone
      }, "Done")
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "44px 0 10px"
      }
    }, /*#__PURE__*/React.createElement(Stamp, {
      animate: true,
      size: "lg",
      angle: -6,
      sub: `${s.name.toUpperCase()} · JUL 10 2026`
    }, "Verified cancelled")), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 14.5,
        color: "var(--text-secondary)",
        textAlign: "center",
        lineHeight: 1.5,
        margin: "16px auto 26px",
        maxWidth: "30ch"
      }
    }, "No charge on your latest statement. It's real. Back in your pocket:"), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: "1px solid var(--rule-strong)",
        margin: "0 8px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "zn-print",
      style: {
        animationDelay: "300ms"
      }
    }, /*#__PURE__*/React.createElement(LedgerLine, {
      label: "Every month",
      value: `+$${s.amount.toFixed(2)}`,
      valueColor: "var(--stamp-verified)"
    })), /*#__PURE__*/React.createElement("div", {
      className: "zn-print",
      style: {
        animationDelay: "345ms"
      }
    }, /*#__PURE__*/React.createElement(LedgerLine, {
      label: "Every year",
      strong: true,
      value: `+$${yearly}`,
      valueColor: "var(--stamp-verified)",
      size: 16
    }))));
  }
  return /*#__PURE__*/React.createElement(Sheet, {
    title: "",
    onClose: onDone
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "44px 0 10px"
    }
  }, /*#__PURE__*/React.createElement(Stamp, {
    animate: true,
    tone: "alert",
    size: "lg",
    angle: 4,
    sub: `$${s.amount.toFixed(2)} ON JUL 08`
  }, "Still charging")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 14.5,
      color: "var(--text-secondary)",
      textAlign: "center",
      lineHeight: 1.55,
      margin: "16px auto 26px",
      maxWidth: "32ch"
    }
  }, "A ", s.name, " charge appeared after you cancelled. That's on them, not you \u2014 let's make it stick this time."), /*#__PURE__*/React.createElement("div", {
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
      size: 17
    })
  }, "Run the steps again"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    fullWidth: true,
    onClick: onDone,
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "life-buoy",
      size: 17
    })
  }, "Escalation help \u2014 chargeback guide")));
}
window.CancelFlowScreen = CancelFlowScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/CancelFlowScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Chrome.jsx
try { (() => {
/* Shared chrome. Ledger language: paper tab bar with hairline rule, active
   tab = overline tick (ledger index tab). Center action = ink seal.
   MOTION: tab switch — icon settles (spring d22 s260); press haptic Light. */

function StatusBar({
  dark = false
}) {
  const color = dark ? "#fff" : "var(--text-primary)";
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

/* Masthead — ledger document header: caps-mono kicker, display title, rule. */
function Masthead({
  kicker,
  title,
  left,
  right,
  rule = true
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      padding: "4px 20px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      minHeight: 44
    }
  }, left, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, kicker && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: "var(--text-tertiary)"
    }
  }, kicker), title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 24,
      letterSpacing: "-0.02em",
      color: "var(--text-primary)",
      marginTop: kicker ? 2 : 0
    }
  }, title)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, right)), rule && /*#__PURE__*/React.createElement("div", {
    style: {
      borderBottom: "1px solid var(--rule)",
      marginTop: 10
    }
  }));
}

/* Small back/close header for stack screens */
function ScreenHeader({
  title,
  left,
  right,
  large = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      padding: "4px 12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 44
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      minWidth: 44
    }
  }, left), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: 11,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
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
  }, right));
}
const TABS = [{
  id: "home",
  icon: "book-open",
  label: "Ledger"
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
  icon: "chart-no-axes-column",
  label: "Insights"
}];
function TabBar({
  active,
  onTab
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      height: 86,
      borderTop: "1px solid var(--rule-strong)",
      background: "var(--surface-card)",
      display: "flex",
      alignItems: "flex-start",
      paddingTop: 0
    }
  }, TABS.map(t => {
    if (t.id === "discover") {
      return /*#__PURE__*/React.createElement("div", {
        key: t.id,
        style: {
          flex: 1,
          display: "flex",
          justifyContent: "center",
          paddingTop: 11
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => onTab("discover"),
        "aria-label": "Discover subscriptions",
        style: {
          width: 52,
          height: 52,
          marginTop: -8,
          borderRadius: "var(--radius-pill)",
          border: "none",
          background: "var(--ink-panel)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-md)",
          cursor: "pointer",
          outline: "1px solid var(--rule-strong)",
          outlineOffset: 3
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "plus",
        size: 26,
        color: "var(--accent)",
        strokeWidth: 2.4
      })));
    }
    const on = active === t.id;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => onTab(t.id),
      style: {
        flex: 1,
        height: 60,
        background: "none",
        border: "none",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        paddingTop: 0,
        color: on ? "var(--text-primary)" : "var(--text-tertiary)",
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 18,
        height: 2.5,
        background: on ? "var(--accent)" : "transparent",
        marginBottom: 7,
        transition: "background var(--dur-fast) var(--ease-out)"
      }
    }), /*#__PURE__*/React.createElement(Icon, {
      name: t.icon,
      size: 22,
      color: on ? "var(--text-primary)" : "var(--text-tertiary)",
      strokeWidth: on ? 2.3 : 1.8
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: on ? 700 : 500,
        letterSpacing: "0.1em",
        textTransform: "uppercase"
      }
    }, t.label));
  }));
}

/* Status → ledger tick-tag map (uses restyled Badge) */
function StatusPill({
  status
}) {
  const map = {
    active: ["success", "Active", false],
    trial: ["warning", "Trial", true],
    paused: ["neutral", "Paused", false],
    pending: ["info", "Verifying", false],
    cancelled: ["success", "Verified ✓", false],
    attention: ["danger", "Still charging", false]
  };
  const [tone, label, hollow] = map[status] || map.active;
  return /*#__PURE__*/React.createElement(Badge, {
    tone: tone,
    hollow: hollow
  }, label);
}
window.StatusBar = StatusBar;
window.Masthead = Masthead;
window.ScreenHeader = ScreenHeader;
window.TabBar = TabBar;
window.StatusPill = StatusPill;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Chrome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/CoachScreen.jsx
try { (() => {
/* Zeno — NEW SCREENS batch 1: Coach (consent as a trust moment), Notifications
   inbox, Spend Twin. All FREE features (per legal).
   COACH SLOP AUDIT — ① Zeno: consent set like a short agreement you actually
   read; coach output = margin annotations in accountant's green, icon is a
   pen, not a sparkle. ② Tempted by: ✨AI gradient card → plain paper + pen.
   ③ Lazy: chat bubble UI with a robot avatar. */
function CoachScreen({
  onClose,
  onCancelSub
}) {
  const [enabled, setEnabled] = React.useState(null); // null = not chosen, false = on-device, true = AI
  const recs = [{
    title: "Cancel Figma",
    body: "No activity in 60 days. You'd feel this one the least.",
    save: "$144/yr",
    id: "figma"
  }, {
    title: "Let the Disney+ trial lapse",
    body: "It converts in 2 days. Doing nothing costs $13.99/mo.",
    save: "$167/yr",
    id: "disney"
  }, {
    title: "Netflix + Max overlap",
    body: "Two video services renewed this month. Keeping one covers most of what you watch.",
    save: "$192/yr",
    id: "hbo"
  }];
  return /*#__PURE__*/React.createElement(Sheet, {
    title: "SPEND COACH",
    onClose: onClose
  }, enabled == null ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 0 0"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pen-line",
    size: 26,
    color: "var(--text-secondary)"
  }), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 23,
      letterSpacing: "-0.02em",
      margin: "12px 0 8px"
    }
  }, "Coaching is optional.", /*#__PURE__*/React.createElement("br", null), "Here's the deal.")), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--rule-strong)",
      marginTop: 8
    }
  }, [["On-device by default", "Zeno's built-in insights run right here. Nothing is sent anywhere."], ["AI coaching, only if you ask", "Enabling it sends your subscription names and amounts — never credentials, never email contents — to generate advice."], ["Revocable", "Turn it off any time in Settings. Off means off."]].map(([t, b], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 12,
      padding: "12px 0",
      borderBottom: "1px solid var(--rule)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      fontWeight: 700,
      color: "var(--text-tertiary)"
    }
  }, String(i + 1).padStart(2, "0")), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-sans)",
      fontWeight: 700,
      fontSize: 14.5
    }
  }, t), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      color: "var(--text-secondary)",
      marginTop: 3,
      lineHeight: 1.5
    }
  }, b))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    onClick: () => setEnabled(false),
    style: {
      flex: 1
    }
  }, "Not now"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: () => setEnabled(true),
    style: {
      flex: 1
    }
  }, "Enable AI coaching")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 9.5,
      letterSpacing: "0.12em",
      color: "var(--text-tertiary)",
      textAlign: "center",
      marginTop: 16,
      paddingTop: 12,
      borderTop: "1px solid var(--rule)"
    }
  }, "GENERAL INFORMATION, NOT FINANCIAL ADVICE.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13.5,
      color: "var(--text-secondary)",
      margin: "8px 0 4px",
      lineHeight: 1.5
    }
  }, enabled ? "AI coaching is on." : "On-device insights only.", " To hit your $80 cap, the margin notes below save the most for the least pain."), recs.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: r.id,
    className: "zn-print",
    style: {
      animationDelay: `${i * 60}ms`,
      display: "flex",
      gap: 12,
      borderLeft: "3px solid var(--accent)",
      paddingLeft: 12,
      margin: "16px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 700,
      fontSize: 15
    }
  }, r.title), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      fontWeight: 700,
      color: "var(--accent-text)"
    }
  }, "+", r.save)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      color: "var(--text-secondary)",
      marginTop: 4,
      lineHeight: 1.5
    }
  }, r.body), /*#__PURE__*/React.createElement("button", {
    onClick: () => onCancelSub(r.id),
    style: {
      background: "none",
      border: "none",
      padding: "8px 0 0",
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.12em",
      color: "var(--text-primary)",
      cursor: "pointer"
    }
  }, "OPEN CANCEL GUIDE \u2197")))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 9.5,
      letterSpacing: "0.12em",
      color: "var(--text-tertiary)",
      textAlign: "center",
      marginTop: 20,
      paddingTop: 12,
      borderTop: "1px solid var(--rule)"
    }
  }, "GENERAL INFORMATION, NOT FINANCIAL ADVICE.")));
}
window.CoachScreen = CoachScreen;

/* Notifications inbox — the alert register. Margin ticks by type. */
function NotificationsScreen({
  onClose,
  onOpen
}) {
  const groups = [["TODAY", [{
    tick: "var(--stamp-alert)",
    icon: "triangle-alert",
    t: "Adobe CC is still charging you",
    s: "$54.99 FOUND ON JUL 08 — CANCELLATION DIDN'T STICK",
    id: "adobe"
  }, {
    tick: "var(--warning)",
    icon: "alarm-clock",
    t: "Disney+ trial ends in 2 days",
    s: "CONVERTS TO $13.99/MO ON JUL 12",
    id: "disney"
  }]], ["THIS WEEK", [{
    tick: "var(--info)",
    icon: "trending-up",
    t: "Netflix raised its price",
    s: "$13.99 → $15.99 /MO · +14%",
    id: "netflix"
  }, {
    tick: "var(--ink-400)",
    icon: "bell",
    t: "Figma renews Jul 9",
    s: "$12.00 · 3-DAY REMINDER",
    id: "figma"
  }, {
    tick: "var(--stamp-verified)",
    icon: "check-check",
    t: "Hulu verified cancelled",
    s: "NO CHARGE FOUND · SAVING $95.88/YR",
    id: "hulu"
  }]]];
  return /*#__PURE__*/React.createElement(Sheet, {
    title: "ALERTS",
    onClose: onClose
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      color: "var(--text-tertiary)",
      margin: "6px 0 0"
    }
  }, "Everything Zeno has warned you about. Quiet hours respected: 10 PM \u2013 8 AM."), groups.map(([label, items]) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: label
  }, /*#__PURE__*/React.createElement(SectionHead, {
    pad: "20px 0 8px"
  }, label), items.map((n, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => onOpen(n.id),
    className: "zn-print",
    style: {
      animationDelay: `${i * 45}ms`,
      display: "flex",
      gap: 12,
      alignItems: "center",
      width: "100%",
      textAlign: "left",
      background: "none",
      border: "none",
      borderBottom: "1px solid var(--rule)",
      padding: "12px 0",
      minHeight: 52,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 3,
      alignSelf: "stretch",
      background: n.tick,
      flex: "none",
      borderRadius: 2
    }
  }), /*#__PURE__*/React.createElement(Icon, {
    name: n.icon,
    size: 17,
    color: n.tick,
    style: {
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-sans)",
      fontWeight: 650,
      fontSize: 14
    }
  }, n.t), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      letterSpacing: "0.08em",
      color: "var(--text-tertiary)",
      marginTop: 3
    }
  }, n.s)), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 15,
    color: "var(--text-tertiary)"
  }))))));
}
window.NotificationsScreen = NotificationsScreen;

/* Spend Twin — you vs the typical subscriber. Two ruled bars, one calm verdict. */
function SpendTwinScreen({
  onClose
}) {
  const you = window.ZENO.monthlyTotal,
    typical = 133;
  const pct = Math.round((1 - you / typical) * 100);
  return /*#__PURE__*/React.createElement(Sheet, {
    title: "SPEND TWIN",
    onClose: onClose
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 0 0"
    }
  }, /*#__PURE__*/React.createElement(LedgerLine, {
    label: "You",
    strong: true,
    value: `$${you.toFixed(2)}/mo`,
    size: 15
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 10,
      background: "var(--text-primary)",
      width: `${you / typical * 100}%`,
      marginBottom: 18
    }
  }), /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Typical subscriber",
    sub: "PUBLISHED AVERAGES",
    value: `$${typical.toFixed(2)}/mo`,
    size: 15
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 10,
      background: "var(--rule-strong)",
      width: "100%"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "26px 0 0",
      borderTop: "1.5px solid var(--rule-strong)",
      paddingTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: 42,
      letterSpacing: "-0.03em",
      color: "var(--stamp-verified)"
    }
  }, pct, "% less"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 14.5,
      color: "var(--text-secondary)",
      lineHeight: 1.55,
      margin: "8px 0 0",
      maxWidth: "32ch"
    }
  }, "Your recurring spend runs leaner than the typical subscriber's. That gap is worth ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--text-primary)"
    }
  }, "$", ((typical - you) * 12).toFixed(0), " a year"), ".")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      letterSpacing: "0.12em",
      color: "var(--text-tertiary)",
      marginTop: 24
    }
  }, "COMPARISON FROM PUBLISHED AVERAGES \u2014 NOT YOUR NEIGHBORS' DATA."));
}
window.SpendTwinScreen = SpendTwinScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/CoachScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/DiscoverScreen.jsx
try { (() => {
/* Zeno — Discover: scan → the receipt. Results arrive as a tear-edge sheet
   that prints row by row under a scan line.
   SLOP AUDIT — ① Zeno: the printing receipt with tear edge + column heads +
   dashed total rule — nobody else's results screen looks like this. ② Tempted
   by: radar/pulse animation → the scan line prints a document instead (honest,
   in-concept). ③ Lazy: spinner → card list with checkboxes.
   MOTION: scan line zn-scanline loops during scan; skeleton rows shimmer;
   results print in (45ms stagger). RN: Reanimated loop + FadeInDown. */
function DiscoverScreen({
  initialMethod,
  onClose,
  onManual,
  onAdded
}) {
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
    conf: "HIGH"
  }, {
    name: "Spotify",
    color: "#1DB954",
    amount: 10.99,
    cat: "Music",
    conf: "HIGH"
  }, {
    name: "ChatGPT Plus",
    color: "#10A37F",
    amount: 20.00,
    cat: "Productivity",
    conf: "HIGH"
  }, {
    name: "iCloud+",
    color: "#3B82F6",
    amount: 2.99,
    cat: "Utilities",
    conf: "MED"
  }, {
    name: "Figma",
    color: "#A259FF",
    amount: 12.00,
    cat: "Productivity",
    conf: "MED"
  }, {
    name: "Audible",
    color: "#F8991C",
    amount: 14.95,
    cat: "Entertainment",
    conf: "LOW"
  }];
  const startScan = () => {
    setStage("scanning");
    setTimeout(() => setStage("results"), 2400);
  };
  if (stage === "hub") {
    const methods = [{
      id: "csv",
      icon: "file-spreadsheet",
      title: "Import a statement",
      body: "Export a CSV yourself — the most complete picture.",
      tag: "RECOMMENDED",
      go: () => {
        setMethod("csv");
        setStage("csv");
      }
    }, {
      id: "email",
      icon: "mail-search",
      title: "Scan email receipts",
      body: "A scan you start. Read on this phone, last 12 months.",
      go: () => {
        setMethod("email");
        setStage("email");
      }
    }, {
      id: "manual",
      icon: "pencil-line",
      title: "Add by hand",
      body: "600+ services with autocomplete, or custom.",
      go: () => onManual && onManual()
    }];
    return /*#__PURE__*/React.createElement(Sheet, {
      title: "DISCOVER",
      onClose: onClose
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 13.5,
        color: "var(--text-secondary)",
        margin: "4px 0 14px",
        lineHeight: 1.5
      }
    }, "Three ways to find what you're paying \u2014 none of them wants your bank login. Zeno scans only when you tap scan."), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: "1px solid var(--rule-strong)"
      }
    }, methods.map((m, i) => /*#__PURE__*/React.createElement("button", {
      key: m.id,
      onClick: m.go,
      className: "zn-print",
      style: {
        animationDelay: `${i * 70}ms`,
        display: "flex",
        gap: 13,
        alignItems: "center",
        textAlign: "left",
        width: "100%",
        background: "none",
        border: "none",
        borderBottom: "1px solid var(--rule)",
        padding: "15px 2px",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 42,
        height: 42,
        flex: "none",
        border: "1px solid var(--rule-strong)",
        borderRadius: "var(--radius-sm)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-card)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon,
      size: 20,
      color: "var(--text-secondary)"
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontWeight: 700,
        fontSize: 15,
        color: "var(--text-primary)"
      }
    }, m.title), m.tag && /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 8.5,
        fontWeight: 700,
        letterSpacing: "0.14em",
        color: "var(--accent-text)"
      }
    }, m.tag)), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block",
        fontFamily: "var(--font-sans)",
        fontSize: 12.5,
        color: "var(--text-tertiary)",
        marginTop: 2
      }
    }, m.body)), /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-right",
      size: 17,
      color: "var(--text-tertiary)"
    })))));
  }
  if (stage === "email") {
    return /*#__PURE__*/React.createElement(Sheet, {
      title: "SCAN RECEIPTS",
      onBack: () => setStage("hub"),
      onClose: onClose
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        borderLeft: "3px solid var(--accent)",
        paddingLeft: 12,
        margin: "6px 0 18px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontWeight: 700,
        fontSize: 14,
        color: "var(--text-primary)"
      }
    }, "Read-only, on this phone, on your command."), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        color: "var(--text-secondary)",
        marginTop: 4,
        lineHeight: 1.5
      }
    }, "Zeno looks at the last 12 months of receipts when you start a scan. Access is revocable any time in Settings.")), /*#__PURE__*/React.createElement("div", {
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
    }, "Connect Gmail \u2014 read-only"), /*#__PURE__*/React.createElement(Button, {
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
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.12em",
        color: "var(--text-tertiary)",
        marginTop: 16,
        textAlign: "center"
      }
    }, "FIRST SCAN FREE"));
  }
  if (stage === "csv") {
    return /*#__PURE__*/React.createElement(Sheet, {
      title: "IMPORT STATEMENT",
      onBack: () => setStage("hub"),
      onClose: onClose
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        borderLeft: "3px solid var(--accent)",
        paddingLeft: 12,
        margin: "6px 0 18px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontWeight: 700,
        fontSize: 14,
        color: "var(--text-primary)"
      }
    }, "You export it. Zeno reads it here."), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        color: "var(--text-secondary)",
        marginTop: 4,
        lineHeight: 1.5
      }
    }, "The CSV is parsed on this phone to spot recurring charges. No bank login required \u2014 that's the point.")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.16em",
        color: "var(--text-tertiary)",
        margin: "0 0 6px"
      }
    }, "HOW TO EXPORT"), ["Open your bank's site or app", "Statements → export as CSV", "Pick the last 3–12 months"].map((t, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        gap: 12,
        alignItems: "baseline",
        padding: "9px 0",
        borderBottom: "1px solid var(--rule)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 700,
        color: "var(--text-tertiary)"
      }
    }, String(i + 1).padStart(2, "0")), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        color: "var(--text-primary)"
      }
    }, t))), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: startScan,
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "upload",
        size: 17
      }),
      style: {
        marginTop: 18
      }
    }, "Choose CSV file"));
  }
  if (stage === "scanning") {
    return /*#__PURE__*/React.createElement(Sheet, {
      title: method === "csv" ? "READING STATEMENT" : "READING RECEIPTS",
      onClose: onClose
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        overflow: "hidden",
        marginTop: 10,
        border: "1px solid var(--rule-strong)",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-card)",
        padding: "18px 16px 22px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: 2,
        background: "var(--accent)",
        boxShadow: "0 0 12px var(--accent)",
        animation: "zn-scanline 1.6s var(--ease-in-out) infinite"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.16em",
        color: "var(--text-tertiary)",
        marginBottom: 14
      }
    }, "PRINTING YOUR RECEIPT\u2026"), [92, 78, 85, 64, 88].map((w, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        padding: "9px 0",
        borderBottom: "1px solid var(--rule)"
      }
    }, /*#__PURE__*/React.createElement(SkeletonRow, {
      width: `${w * 0.6}%`,
      height: 12
    }), /*#__PURE__*/React.createElement(SkeletonRow, {
      width: 48,
      height: 12
    })))), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        color: "var(--text-tertiary)",
        textAlign: "center",
        marginTop: 16
      }
    }, "Read on this phone. Cancel any time."), /*#__PURE__*/React.createElement("button", {
      onClick: () => setStage(method),
      style: {
        display: "block",
        margin: "6px auto 0",
        background: "none",
        border: "none",
        color: "var(--text-tertiary)",
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.14em",
        cursor: "pointer",
        padding: 10
      }
    }, "CANCEL"));
  }
  return /*#__PURE__*/React.createElement(ResultsReview, {
    found: found,
    method: method,
    onClose: onClose,
    onAdded: onAdded
  });
}

/* The receipt — tear-edge sheet, column heads, dashed total rule */
function ResultsReview({
  found,
  method,
  onClose,
  onAdded
}) {
  const [sel, setSel] = React.useState(() => found.map((_, i) => i < 5));
  const count = sel.filter(Boolean).length;
  const sum = found.reduce((a, f, i) => a + (sel[i] ? f.amount : 0), 0);
  const confColor = {
    HIGH: "var(--stamp-verified)",
    MED: "#A36A0B",
    LOW: "var(--text-tertiary)"
  };
  return /*#__PURE__*/React.createElement(Sheet, {
    title: "SCAN RESULTS",
    onClose: onClose,
    footer: /*#__PURE__*/React.createElement(Button, {
      variant: "money",
      size: "lg",
      fullWidth: true,
      disabled: count === 0,
      onClick: () => onAdded(count)
    }, count === 0 ? "Select entries" : `Add ${count} · $${sum.toFixed(2)}/mo`)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "8px -4px 0"
    }
  }, /*#__PURE__*/React.createElement(TearEdge, {
    flip: true,
    color: "var(--surface-card)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      borderLeft: "1px solid var(--rule)",
      borderRight: "1px solid var(--rule)",
      borderBottom: "1px solid var(--rule)",
      padding: "14px 14px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.2em",
      color: "var(--text-tertiary)"
    }
  }, "ZENO \xB7 ", method === "csv" ? "STATEMENT SCAN" : "RECEIPT SCAN", " \xB7 JUL 10"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      color: "var(--text-secondary)",
      margin: "6px 0 12px"
    }
  }, found.length, " recurring charges found. Untick anything that isn't real."), /*#__PURE__*/React.createElement(ColumnHeads, {
    left: "\u2713 SERVICE",
    right: "CONF / AMOUNT",
    style: {
      padding: "0 2px 6px"
    }
  }), found.map((f, i) => {
    const on = sel[i];
    return /*#__PURE__*/React.createElement("div", {
      key: f.name,
      onClick: () => setSel(s => s.map((v, j) => j === i ? !v : v)),
      className: "zn-print",
      style: {
        animationDelay: `${i * 45}ms`,
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "10px 2px",
        borderBottom: "1px solid var(--rule)",
        cursor: "pointer",
        opacity: on ? 1 : 0.45
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 20,
        height: 20,
        flex: "none",
        borderRadius: 4,
        border: `1.5px solid ${on ? "var(--accent)" : "var(--border-strong)"}`,
        background: on ? "var(--accent)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, on && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13,
      color: "var(--text-on-accent)",
      strokeWidth: 3.2
    })), /*#__PURE__*/React.createElement(ServiceAvatar, {
      name: f.name,
      color: f.color,
      size: 32
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block",
        fontFamily: "var(--font-sans)",
        fontWeight: 650,
        fontSize: 14,
        color: "var(--text-primary)"
      }
    }, f.name), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block",
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        letterSpacing: "0.1em",
        color: confColor[f.conf]
      }
    }, f.conf, " CONFIDENCE")), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 14,
        fontWeight: 700,
        color: "var(--text-primary)",
        fontFeatureSettings: "'tnum' 1"
      }
    }, "$", f.amount.toFixed(2)));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      borderBottom: "2px dashed var(--rule-strong)",
      margin: "4px 0"
    }
  }), /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Selected total",
    strong: true,
    value: `$${sum.toFixed(2)} /mo`,
    valueColor: "var(--accent-text)"
  })), /*#__PURE__*/React.createElement(TearEdge, {
    color: "var(--surface-card)"
  })));
}

/* Full-screen sheet shell */
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
      background: "var(--bg-app)"
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
      size: 21
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      padding: "4px 20px 16px"
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      padding: "12px 20px 28px",
      borderTop: "1px solid var(--rule-strong)",
      background: "var(--surface-card)"
    }
  }, footer));
}
window.DiscoverScreen = DiscoverScreen;
window.Sheet = Sheet;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/DiscoverScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/FamilyScreen.jsx
try { (() => {
/* Zeno — NEW SCREENS batch 2: Family Vault, Security/App lock, Widgets preview,
   Wrapped (year in review).
   FAMILY SLOP AUDIT — ① Zeno: share code as mono boxes; members are ledger
   lines of totals ONLY; FX exclusion styled with dignity. ② Tempted by:
   avatars-in-a-circle happy-family card → a plain register of totals.
   ③ Lazy: invite card with emoji household. */
function FamilyScreen({
  onClose
}) {
  const [joined, setJoined] = React.useState(true);
  if (!joined) {
    return /*#__PURE__*/React.createElement(Sheet, {
      title: "FAMILY VAULT",
      onClose: onClose
    }, /*#__PURE__*/React.createElement("h2", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 23,
        letterSpacing: "-0.02em",
        margin: "14px 0 8px"
      }
    }, "One household, totals only."), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        color: "var(--text-secondary)",
        lineHeight: 1.55,
        margin: "0 0 20px"
      }
    }, "Members see each other's monthly total \u2014 never the list behind it. What you subscribe to stays yours."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: () => setJoined(true)
    }, "Create a household"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "lg",
      fullWidth: true,
      onClick: () => setJoined(true)
    }, "Join with a code")));
  }
  return /*#__PURE__*/React.createElement(Sheet, {
    title: "FAMILY VAULT",
    onClose: onClose
  }, /*#__PURE__*/React.createElement(SectionHead, {
    pad: "10px 0 8px"
  }, "Share code"), /*#__PURE__*/React.createElement(CodeBoxes, {
    code: "ZN4K7Q2M"
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      letterSpacing: "0.12em",
      color: "var(--text-tertiary)",
      textAlign: "center",
      margin: "10px 0 0"
    }
  }, "UP TO 5 MEMBERS \xB7 CODE ROTATES WHEN SOMEONE LEAVES"), /*#__PURE__*/React.createElement(SectionHead, {
    pad: "22px 0 8px"
  }, "Combined this month"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: 44,
      letterSpacing: "-0.035em",
      fontFeatureSettings: "'tnum' 1"
    }
  }, "$214.90"), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--rule-strong)",
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(LedgerLine, {
    label: "You",
    value: "$75.96"
  }), /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Sam",
    value: "$82.40"
  }), /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Rio",
    value: "$56.54"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
      marginTop: 14,
      borderLeft: "3px solid var(--ink-300)",
      paddingLeft: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      color: "var(--text-secondary)",
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--text-primary)"
    }
  }, "1 member counts in GBP."), " No exchange rate is available right now, so their \xA341.00 isn't in the combined total. We'd rather exclude it than guess.")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22
    }
  }, /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Members see",
    value: "TOTALS ONLY"
  }), /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Members never see",
    value: "YOUR LIST"
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    size: "md",
    fullWidth: true,
    onClick: () => setJoined(false),
    style: {
      marginTop: 20
    }
  }, "Leave household"));
}
window.FamilyScreen = FamilyScreen;

/* Security — the seal. A privacy app's lock is a brand moment.
   MOTION: lock overlay drops in (settle); PIN dots fill with selection haptic. */
function SecurityScreen({
  onClose
}) {
  const [faceId, setFaceId] = React.useState(true);
  const [locked, setLocked] = React.useState(false);
  const [pin, setPin] = React.useState(0);
  if (locked) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--ink-panel)",
        alignItems: "center",
        justifyContent: "center",
        padding: 32
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/zeno-mark.svg",
      width: "44",
      height: "44",
      style: {
        filter: "brightness(0) invert(1)",
        opacity: 0.9
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.22em",
        color: "rgba(255,255,255,0.55)",
        margin: "18px 0 6px"
      }
    }, "THIS LEDGER IS SEALED"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12,
        margin: "22px 0 26px"
      }
    }, [0, 1, 2, 3].map(i => /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        width: 12,
        height: 12,
        borderRadius: "50%",
        border: "1.5px solid rgba(255,255,255,0.5)",
        background: i < pin ? "var(--accent)" : "transparent",
        borderColor: i < pin ? "var(--accent)" : "rgba(255,255,255,0.5)",
        transition: "background var(--dur-fast)"
      }
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 64px)",
        gap: 12
      }
    }, [1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k, i) => /*#__PURE__*/React.createElement("button", {
      key: i,
      disabled: k === "",
      onClick: () => {
        if (k === "⌫") setPin(p => Math.max(0, p - 1));else {
          const n = pin + 1;
          setPin(n);
          if (n >= 4) setTimeout(() => {
            setLocked(false);
            setPin(0);
          }, 250);
        }
      },
      style: {
        height: 56,
        borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.18)",
        background: "none",
        color: "#fff",
        fontFamily: "var(--font-mono)",
        fontSize: 20,
        fontWeight: 600,
        cursor: k === "" ? "default" : "pointer",
        visibility: k === "" ? "hidden" : "visible"
      }
    }, k))), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setLocked(false);
        setPin(0);
      },
      style: {
        marginTop: 26,
        background: "none",
        border: "none",
        color: "rgba(255,255,255,0.6)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.16em",
        cursor: "pointer"
      }
    }, "UNLOCK WITH FACE ID"));
  }
  return /*#__PURE__*/React.createElement(Sheet, {
    title: "APP LOCK",
    onClose: onClose
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 23,
      letterSpacing: "-0.02em",
      margin: "14px 0 8px"
    }
  }, "Seal the ledger."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      color: "var(--text-secondary)",
      lineHeight: 1.55,
      margin: "0 0 14px"
    }
  }, "A 4-digit PIN (and Face ID, if you like) locks Zeno whenever it leaves the foreground."), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--rule-strong)"
    }
  }, /*#__PURE__*/React.createElement(LedgerLine, {
    label: "PIN",
    value: "SET \xB7 \u2022\u2022\u2022\u2022"
  }), /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Face ID",
    value: /*#__PURE__*/React.createElement(Switch, {
      checked: faceId,
      onChange: setFaceId,
      size: "sm"
    })
  }), /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Lock after",
    value: "IMMEDIATELY"
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    fullWidth: true,
    onClick: () => setLocked(true),
    style: {
      marginTop: 20
    },
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 16
    })
  }, "Preview the lock screen"));
}
window.SecurityScreen = SecurityScreen;

/* Widgets & Watch — honestly labeled preview. */
function WidgetsScreen({
  onClose
}) {
  return /*#__PURE__*/React.createElement(Sheet, {
    title: "WIDGETS & WATCH",
    onClose: onClose
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignSelf: "flex-start",
      margin: "12px 0 6px"
    }
  }, /*#__PURE__*/React.createElement(Stamp, {
    size: "sm",
    tone: "neutral",
    angle: -3
  }, "Preview \u2014 coming soon")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13.5,
      color: "var(--text-secondary)",
      lineHeight: 1.5,
      margin: "10px 0 18px"
    }
  }, "This is the design, not a shipped feature. It ships when it's good."), /*#__PURE__*/React.createElement(SectionHead, {
    pad: "0 0 10px"
  }, "Home screen"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 132,
      height: 132,
      background: "var(--ink-panel)",
      borderRadius: 22,
      padding: 14,
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 8,
      letterSpacing: "0.16em",
      color: "rgba(255,255,255,0.5)"
    }
  }, "NEXT RENEWAL"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 700,
      fontSize: 15,
      color: "#fff",
      marginTop: 8
    }
  }, "Figma"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: 19,
      color: "var(--accent)",
      marginTop: 2
    }
  }, "$12.00"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      letterSpacing: "0.1em",
      color: "rgba(255,255,255,0.55)",
      marginTop: "auto"
    }
  }, "TOMORROW")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 132,
      background: "var(--surface-card)",
      border: "1px solid var(--rule-strong)",
      borderRadius: 22,
      padding: 14,
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 8,
      letterSpacing: "0.16em",
      color: "var(--text-tertiary)"
    }
  }, "THIS MONTH"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: 22,
      marginTop: 6,
      fontFeatureSettings: "'tnum' 1"
    }
  }, "$75.96"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontFamily: "var(--font-mono)",
      fontSize: 9.5,
      color: "var(--text-secondary)",
      padding: "2px 0"
    }
  }, /*#__PURE__*/React.createElement("span", null, "FIGMA"), /*#__PURE__*/React.createElement("span", null, "JUL 9")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontFamily: "var(--font-mono)",
      fontSize: 9.5,
      color: "var(--text-secondary)",
      padding: "2px 0"
    }
  }, /*#__PURE__*/React.createElement("span", null, "DISNEY+"), /*#__PURE__*/React.createElement("span", null, "JUL 12"))))), /*#__PURE__*/React.createElement(SectionHead, {
    pad: "20px 0 10px"
  }, "Watch"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 96,
      height: 96,
      borderRadius: "50%",
      background: "var(--ink-panel)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      border: "4px solid var(--ink-300)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 7.5,
      letterSpacing: "0.14em",
      color: "rgba(255,255,255,0.5)"
    }
  }, "NEXT"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: 15,
      color: "#fff"
    }
  }, "$12"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 7.5,
      letterSpacing: "0.1em",
      color: "var(--accent)"
    }
  }, "TMRW")));
}
window.WidgetsScreen = WidgetsScreen;

/* Wrapped — "The year, audited." Story beats in ledger language: ink pages,
   numbers that print up, final stamp. Tap to advance. NOT an IG-story clone:
   no gradients, no progress worms — page ticks like a document footer.
   MOTION: beat transition = page settle; numbers count up (AnimatedNumber);
   final stamp thunk + Success haptic. Reduced motion: crossfades. */
function WrappedScreen({
  onClose
}) {
  const [beat, setBeat] = React.useState(0);
  const beats = [{
    k: "01 · THE YEAR, AUDITED",
    big: "2026",
    sub: "Your subscriptions, on the record. Tap through."
  }, {
    k: "02 · TOTAL COMMITTED",
    big: "$818.44",
    sub: "Across 10 tracked subscriptions since March — 10 months on the books."
  }, {
    k: "03 · THE HEAVYWEIGHT",
    big: "$54.99/mo",
    sub: "Adobe CC was your most expensive line. It's also the one still fighting you."
  }, {
    k: "04 · PROOF OF WORK",
    big: "$427/yr",
    sub: "Back in your pocket from 3 verified cancellations. Not promised — proven."
  }];
  const last = beat === beats.length;
  return /*#__PURE__*/React.createElement("div", {
    onClick: () => !last && setBeat(b => b + 1),
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "var(--ink-panel)",
      cursor: last ? "default" : "pointer",
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 20px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 5
    }
  }, [...beats, 0].map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 15,
      height: 2.5,
      background: i <= beat ? "var(--accent)" : "rgba(255,255,255,0.2)"
    }
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onClose();
    },
    "aria-label": "Close",
    style: {
      background: "none",
      border: "none",
      color: "rgba(255,255,255,0.7)",
      cursor: "pointer",
      padding: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 20,
    color: "rgba(255,255,255,0.7)"
  }))), !last ? /*#__PURE__*/React.createElement("div", {
    key: beat,
    className: "zn-print",
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "0 28px 60px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.22em",
      color: "var(--accent)"
    }
  }, beats[beat].k), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: 64,
      lineHeight: 1,
      letterSpacing: "-0.045em",
      color: "#fff",
      margin: "16px 0",
      fontFeatureSettings: "'tnum' 1"
    }
  }, beats[beat].big), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 15.5,
      color: "rgba(255,255,255,0.72)",
      lineHeight: 1.55,
      maxWidth: "28ch"
    }
  }, beats[beat].sub), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: 26,
      left: 28,
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      letterSpacing: "0.18em",
      color: "rgba(255,255,255,0.4)"
    }
  }, "TAP TO TURN THE PAGE")) : /*#__PURE__*/React.createElement("div", {
    className: "zn-print",
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 28px 40px"
    }
  }, /*#__PURE__*/React.createElement(Stamp, {
    animate: true,
    size: "lg",
    angle: -6,
    sub: "10 MONTHS \xB7 10 SUBSCRIPTIONS \xB7 $427 SAVED",
    style: {
      color: "var(--accent)",
      borderColor: "var(--accent)",
      outlineColor: "var(--accent)"
    }
  }, "Audited 2026"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13.5,
      color: "rgba(255,255,255,0.65)",
      textAlign: "center",
      margin: "26px 0 0",
      maxWidth: "30ch",
      lineHeight: 1.55
    }
  }, "Coverage note: tracking since March. Next year gets the full twelve."), /*#__PURE__*/React.createElement(Button, {
    variant: "money",
    size: "lg",
    onClick: e => {
      e.stopPropagation();
    },
    style: {
      marginTop: 28
    },
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "share",
      size: 16
    })
  }, "Share the audit")));
}
window.WrappedScreen = WrappedScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/FamilyScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/HomeScreen.jsx
try { (() => {
/* Zeno — Home: "the statement". Typographic hero ON paper (no floating card),
   ledger lines everywhere, rules not boxes.
   SLOP AUDIT — ① Zeno: hero total is pure editorial type + LedgerLines; budget
   is one ledger line with a tick-tag; attention rows use margin ticks. ② Tempted
   by: big-number-in-dark-card + stat grid → deleted the card (delete-a-card test),
   type does the work. ③ Lazy version: dashboard of 6 rounded stat cards.
   MOTION: total settles (zn-count-settle; RN AnimatedNumber count-up 600ms);
   sections print in staggered. Pull-to-refresh: rule line tears + re-prints. */
function HomeScreen({
  hasData,
  onOpen,
  onTab,
  onDiscover,
  onAdd,
  onSettings,
  onBudget,
  onUpgrade,
  onBell
}) {
  const Z = window.ZENO;
  const total = Z.monthlyTotal;
  const billing = Z.subscriptions.filter(s => ["active", "trial"].includes(s.status));
  const upcoming = billing.slice(0, 4);
  const atLimit = Z.trackedCount >= Z.freeLimit;
  const byCat = {};
  billing.forEach(s => {
    byCat[s.cat] = (byCat[s.cat] || 0) + s.amount;
  });
  const segs = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const attention = [];
  Z.subscriptions.forEach(s => {
    if (s.status === "attention") attention.push({
      sub: s,
      color: "var(--stamp-alert)",
      icon: "triangle-alert",
      label: `${s.name} is still charging you`,
      sub2: `CANCELLED ${s.cancelledOn.toUpperCase()} · CHARGE FOUND JUL 08`
    });
  });
  Z.subscriptions.forEach(s => {
    if (s.status === "trial") attention.push({
      sub: s,
      color: "var(--warning)",
      icon: "alarm-clock",
      label: `${s.name} trial ends in 2 days`,
      sub2: `CONVERTS TO $${s.amount.toFixed(2)}/MO ON ${s.trialEnds.toUpperCase()}`
    });
  });
  Z.subscriptions.forEach(s => {
    if (s.priceHike) attention.push({
      sub: s,
      color: "var(--info)",
      icon: "trending-up",
      label: `${s.name} raised its price`,
      sub2: `$${s.priceHike.from.toFixed(2)} → $${s.priceHike.to.toFixed(2)} /MO · +14%`
    });
  });
  const header = /*#__PURE__*/React.createElement(Masthead, {
    kicker: "THE LEDGER \xB7 THU JUL 10",
    title: "Morning, Alex",
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
      size: 38,
      shape: "circle"
    })),
    right: /*#__PURE__*/React.createElement(IconButton, {
      label: "Notifications",
      onClick: onBell
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "bell",
      size: 20
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
        justifyContent: "center",
        padding: "0 32px 40px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.18em",
        color: "var(--text-tertiary)",
        marginBottom: 10
      }
    }, "PAGE 1 \u2014 BLANK"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 26,
        letterSpacing: "-0.02em",
        color: "var(--text-primary)",
        marginBottom: 8,
        lineHeight: 1.15
      }
    }, "Nothing on the books yet."), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 14.5,
        color: "var(--text-secondary)",
        lineHeight: 1.55,
        margin: "0 0 24px"
      }
    }, "Run your first free scan \u2014 no bank login required \u2014 or write the first line yourself."), /*#__PURE__*/React.createElement(Button, {
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
    }, "Add one by hand")));
  }
  const B = Z.budget;
  const over = B.projected > B.cap,
    approaching = !over && B.projected > 0.85 * B.cap;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      overflowX: "hidden",
      paddingBottom: 24
    }
  }, header, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 20px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: "0.18em",
      color: "var(--text-tertiary)",
      whiteSpace: "nowrap"
    }
  }, "COMMITTED THIS MONTH"), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      flex: 1,
      borderBottom: "2px dotted var(--rule-strong)",
      transform: "translateY(-3px)",
      minWidth: 12
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: atLimit ? onUpgrade : undefined,
    style: {
      background: "none",
      border: "none",
      padding: 0,
      cursor: atLimit ? "pointer" : "default",
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: "0.08em",
      color: atLimit ? "var(--accent-text)" : "var(--text-tertiary)",
      whiteSpace: "nowrap"
    }
  }, Z.trackedCount, "/", Z.freeLimit, " FREE", atLimit ? " ↗" : "")), /*#__PURE__*/React.createElement("div", {
    className: "zn-print",
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: 58,
      lineHeight: 1,
      letterSpacing: "-0.045em",
      color: "var(--text-primary)",
      fontFeatureSettings: "'tnum' 1"
    }
  }, "$", Math.floor(total), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 28,
      fontWeight: 600,
      opacity: 0.55
    }
  }, ".", (total % 1).toFixed(2).slice(2)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 2,
      height: 4,
      marginTop: 14
    }
  }, segs.map(([cat, val]) => /*#__PURE__*/React.createElement("div", {
    key: cat,
    title: cat,
    style: {
      flex: val,
      background: `var(--cat-${cat})`
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderBottom: "1px solid var(--rule-strong)",
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Charged so far",
    value: `$${B.committed.toFixed(2)}`
  }), /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Still to renew",
    sub: "2 RENEWALS",
    value: `$${(B.projected - B.committed).toFixed(2)}`
  })), /*#__PURE__*/React.createElement(LedgerLine, {
    onClick: onBudget,
    label: "Budget",
    sub: `CAP $${B.cap}`,
    value: over ? `$${(B.projected - B.cap).toFixed(2)} OVER` : approaching ? `$${(B.cap - B.projected).toFixed(2)} LEFT` : "ON PACE",
    valueColor: over ? "var(--stamp-alert)" : approaching ? "#A36A0B" : "var(--stamp-verified)",
    strong: true
  })), attention.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SectionHead, null, "Needs attention"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px"
    }
  }, attention.map((a, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => onOpen(a.sub.id),
    className: "zn-print",
    style: {
      animationDelay: `${i * 45}ms`,
      display: "flex",
      alignItems: "center",
      gap: 12,
      width: "100%",
      textAlign: "left",
      background: "none",
      border: "none",
      borderBottom: "1px solid var(--rule)",
      padding: "13px 0",
      minHeight: 48,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 3,
      alignSelf: "stretch",
      background: a.color,
      flex: "none",
      borderRadius: 2
    }
  }), /*#__PURE__*/React.createElement(Icon, {
    name: a.icon,
    size: 18,
    color: a.color,
    style: {
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-sans)",
      fontWeight: 650,
      fontSize: 14.5,
      color: "var(--text-primary)",
      letterSpacing: "-0.01em"
    }
  }, a.label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-mono)",
      fontSize: 9.5,
      letterSpacing: "0.08em",
      color: "var(--text-tertiary)",
      marginTop: 3
    }
  }, a.sub2)), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 16,
    color: "var(--text-tertiary)"
  }))))), /*#__PURE__*/React.createElement(SectionHead, {
    right: /*#__PURE__*/React.createElement("button", {
      onClick: () => onTab("subs"),
      style: {
        background: "none",
        border: "none",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: "0.14em",
        color: "var(--accent-text)",
        cursor: "pointer"
      }
    }, "ALL \u2197")
  }, "Upcoming"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 6px"
    }
  }, upcoming.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    className: "zn-print",
    style: {
      animationDelay: `${i * 45}ms`
    }
  }, /*#__PURE__*/React.createElement(ListRow, {
    divider: i < upcoming.length - 1,
    leading: /*#__PURE__*/React.createElement(ServiceAvatar, {
      name: s.name,
      color: s.color,
      size: 38
    }),
    title: s.name,
    subtitle: `${s.next.toUpperCase()} · ${s.category.toUpperCase()}`,
    amount: `$${s.amount.toFixed(2)}`,
    onClick: () => onOpen(s.id)
  })))), /*#__PURE__*/React.createElement(SectionHead, {
    right: /*#__PURE__*/React.createElement("button", {
      onClick: () => onTab("insights"),
      style: {
        background: "none",
        border: "none",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: "0.14em",
        color: "var(--accent-text)",
        cursor: "pointer"
      }
    }, "MORE \u2197")
  }, "Ways to save"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px"
    }
  }, Z.insights.slice(0, 2).map(ins => /*#__PURE__*/React.createElement("div", {
    key: ins.id,
    onClick: () => onTab("insights"),
    style: {
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(LedgerLine, {
    label: ins.title,
    sub: ins.body.split("·")[0].trim().toUpperCase().slice(0, 24),
    value: `+$${ins.save}/yr`,
    valueColor: "var(--accent-text)"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      padding: "24px 20px 0"
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
  }, "Add")));
}
window.HomeScreen = HomeScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/InsightsScreen.jsx
try { (() => {
/* Zeno — Insights: the audit page. Ink bar chart, category rules, savings
   ledger, tools row (ALL FREE per legal — coach/insights are not Pro).
   SLOP AUDIT — ① Zeno: chart bars sit ON the baseline rule; categories are
   LedgerLines with inline tick bars; tools are rule-framed, not cards.
   ② Tempted by: donut chart + Pro-locked tool grid → rules + honest free
   labels. ③ Lazy: card grid of stats with a pie chart. */
function InsightsScreen({
  onBudget,
  onCoach,
  onTwin,
  onWrapped,
  onWidgets
}) {
  const Z = window.ZENO;
  const max = Math.max(...Z.trend.map(t => t[1]));
  const total = Z.monthlyTotal;
  const catTotal = Z.categories.reduce((a, c) => a + c.spent, 0);
  const B = Z.budget;
  const over = B.projected > B.cap,
    approaching = !over && B.projected > 0.85 * B.cap;
  const tools = [{
    icon: "pen-line",
    label: "Spend Coach",
    sub: "FREE",
    go: onCoach
  }, {
    icon: "scale",
    label: "Spend Twin",
    sub: "FREE",
    go: onTwin
  }, {
    icon: "book-marked",
    label: "Year in Review",
    sub: "FREE",
    go: onWrapped
  }, {
    icon: "layout-grid",
    label: "Widgets & Watch",
    sub: "PREVIEW",
    go: onWidgets
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      overflowX: "hidden",
      paddingBottom: 24
    }
  }, /*#__PURE__*/React.createElement(Masthead, {
    kicker: "THE AUDIT",
    title: "Insights"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 20px 0"
    }
  }, /*#__PURE__*/React.createElement(LedgerLine, {
    onClick: onBudget,
    strong: true,
    label: "Budget",
    sub: `FORECAST $${B.projected.toFixed(2)} / CAP $${B.cap}`,
    value: over ? "OVER" : approaching ? "CLOSE" : "ON PACE",
    valueColor: over ? "var(--stamp-alert)" : approaching ? "#A36A0B" : "var(--stamp-verified)"
  })), /*#__PURE__*/React.createElement(SectionHead, null, "Six months"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "4px 20px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 8,
      height: 120
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
        justifyContent: "flex-end",
        gap: 6
      }
    }, last && /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        fontWeight: 700,
        color: "var(--accent-text)"
      }
    }, "$", v.toFixed(0)), /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        maxWidth: 26,
        height: `${v / max * 80}px`,
        background: last ? "var(--text-primary)" : "var(--rule-strong)",
        borderRadius: "3px 3px 0 0",
        transition: "height var(--dur-slow) var(--ease-out)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        letterSpacing: "0.1em",
        color: last ? "var(--text-primary)" : "var(--text-tertiary)",
        fontWeight: last ? 700 : 500
      }
    }, m.toUpperCase()));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1.5px solid var(--rule-strong)",
      marginTop: 0
    }
  }), /*#__PURE__*/React.createElement(LedgerLine, {
    label: "This month",
    strong: true,
    value: `$${total.toFixed(2)}`
  })), /*#__PURE__*/React.createElement(SectionHead, null, "Where it goes"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px"
    }
  }, Z.categories.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.category,
    style: {
      padding: "2px 0 8px",
      borderBottom: "1px solid var(--rule)"
    }
  }, /*#__PURE__*/React.createElement(LedgerLine, {
    label: /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 10,
        height: 3,
        background: `var(--cat-${c.cat})`
      }
    }), c.category),
    sub: `${Math.round(c.spent / catTotal * 100)}%`,
    value: `$${c.spent.toFixed(2)}`,
    style: {
      padding: "5px 0 3px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 3,
      background: "var(--surface-sunken)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${c.spent / catTotal * 100}%`,
      height: "100%",
      background: `var(--cat-${c.cat})`
    }
  }))))), /*#__PURE__*/React.createElement(SectionHead, null, "Ways to save"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px"
    }
  }, Z.insights.map((ins, i) => /*#__PURE__*/React.createElement("div", {
    key: ins.id,
    className: "zn-print",
    style: {
      animationDelay: `${i * 45}ms`,
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      padding: "11px 0",
      borderBottom: "1px solid var(--rule)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ins.icon,
    size: 17,
    color: "var(--text-secondary)",
    style: {
      marginTop: 2,
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-sans)",
      fontWeight: 650,
      fontSize: 14,
      color: "var(--text-primary)"
    }
  }, ins.title), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      color: "var(--text-tertiary)",
      marginTop: 2
    }
  }, ins.body)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      fontWeight: 700,
      color: "var(--accent-text)"
    }
  }, "+$", ins.save, "/yr")))), /*#__PURE__*/React.createElement(SectionHead, null, "Tools"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10
    }
  }, tools.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.label,
    onClick: t.go,
    style: {
      textAlign: "left",
      background: "var(--surface-card)",
      border: "1px solid var(--rule-strong)",
      borderRadius: "var(--radius-sm)",
      padding: "13px 14px",
      cursor: "pointer",
      minHeight: 44
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: t.icon,
    size: 19,
    color: "var(--text-secondary)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 8,
      fontWeight: 700,
      letterSpacing: "0.16em",
      color: t.sub === "PREVIEW" ? "var(--text-tertiary)" : "var(--accent-text)"
    }
  }, t.sub)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 650,
      fontSize: 13.5,
      color: "var(--text-primary)",
      marginTop: 10
    }
  }, t.label)))));
}
window.InsightsScreen = InsightsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/InsightsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Ledger.jsx
try { (() => {
/* Zeno Ledger Kit — the named signature elements of "The Honest Ledger".
   ① LedgerLine  ② Stamp  ③ SectionHead / ColumnHeads  ④ print-in (zn-print)
   Plus: SheetShell (tear-edge receipt), BottomSheetLite, SkeletonRow, CodeBoxes.
   Every element here appears on 3+ screens — that's the contract. */

/* ③ SectionHead — caps-mono ledger column head with trailing hairline */
function SectionHead({
  children,
  right,
  pad = "26px 20px 10px"
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: pad
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: "var(--text-tertiary)",
      whiteSpace: "nowrap"
    }
  }, children), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      borderBottom: "1px solid var(--rule)"
    }
  }), right);
}

/* ③b ColumnHeads — table header for ledger lists ("SERVICE … AMOUNT") */
function ColumnHeads({
  left,
  right,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "0 14px 6px",
      borderBottom: "1px solid var(--rule-strong)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.18em",
      color: "var(--text-tertiary)"
    }
  }, left), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.18em",
      color: "var(--text-tertiary)"
    }
  }, right));
}

/* ① LedgerLine — label ……… mono value. The signature row. */
function LedgerLine({
  label,
  sub,
  value,
  valueColor = "var(--text-primary)",
  strong = false,
  size = 14,
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 10,
      padding: "7px 0",
      cursor: onClick ? "pointer" : "default",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "none",
      fontFamily: "var(--font-sans)",
      fontSize: size,
      fontWeight: strong ? 700 : 500,
      color: strong ? "var(--text-primary)" : "var(--text-secondary)"
    }
  }, label, sub && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      color: "var(--text-tertiary)",
      marginLeft: 8,
      letterSpacing: "0.04em"
    }
  }, sub)), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      flex: 1,
      borderBottom: "2px dotted var(--rule-strong)",
      transform: "translateY(-3px)",
      minWidth: 14
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "none",
      fontFamily: "var(--font-mono)",
      fontSize: size + 1,
      fontWeight: 700,
      color: valueColor,
      fontFeatureSettings: "'tnum' 1",
      letterSpacing: "-0.01em"
    }
  }, value));
}

/* ② The Zeno Stamp — inked verification mark. Thunks down (zn-stamp).
   RN: withSpring(scale 1.7→1, damping 14, stiffness 420) + Haptics.notificationAsync(Success).
   Reduced motion: fades in. */
function Stamp({
  tone = "verified",
  children,
  sub,
  angle = -5,
  size = "md",
  animate = false,
  style
}) {
  const color = tone === "alert" ? "var(--stamp-alert)" : tone === "neutral" ? "var(--ink-400)" : "var(--stamp-verified)";
  const dims = size === "lg" ? {
    fs: 17,
    pad: "14px 22px",
    sub: 10
  } : size === "sm" ? {
    fs: 10,
    pad: "4px 9px",
    sub: 8
  } : {
    fs: 13,
    pad: "9px 16px",
    sub: 9
  };
  return /*#__PURE__*/React.createElement("span", {
    className: animate ? "zn-stamp" : "",
    style: {
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 3,
      padding: dims.pad,
      border: `2.5px solid ${color}`,
      outline: `1px solid ${color}`,
      outlineOffset: 2.5,
      borderRadius: 6,
      color,
      transform: `rotate(${angle}deg)`,
      opacity: 0.94,
      "--stamp-angle": `${angle}deg`,
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: dims.fs,
      lineHeight: 1
    }
  }, children), sub && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: dims.sub,
      letterSpacing: "0.2em",
      opacity: 0.75
    }
  }, sub));
}

/* SheetShell — receipt torn off the roll: zig-zag tear edge at the top */
function TearEdge({
  flip = false,
  color = "var(--surface-card)"
}) {
  const grad = `linear-gradient(${flip ? 135 : -45}deg, ${color} 6px, transparent 0), linear-gradient(${flip ? -135 : 45}deg, ${color} 6px, transparent 0)`;
  return /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      height: 9,
      flex: "none",
      background: grad,
      backgroundSize: "14px 14px",
      backgroundRepeat: "repeat-x",
      transform: flip ? "scaleY(-1)" : "none"
    }
  });
}

/* SkeletonRow — shimmer placeholder (loading states). RN: moti/Reanimated loop. */
function SkeletonRow({
  width = "100%",
  height = 14,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: 4,
      background: "linear-gradient(90deg, var(--surface-sunken) 25%, var(--ink-75) 50%, var(--surface-sunken) 75%)",
      backgroundSize: "200px 100%",
      animation: "zn-shimmer 1.1s linear infinite",
      ...style
    }
  });
}

/* BottomSheetLite — designed replacement for system Alert pickers (F3).
   variant: options list or destructive confirm. RN: @gorhom/bottom-sheet. */
function BottomSheetLite({
  title,
  options,
  onPick,
  onClose,
  destructive
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      zIndex: 80,
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--overlay)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "zn-sheet",
    style: {
      position: "relative",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement(TearEdge, null), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      padding: "14px 20px 30px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: "var(--text-tertiary)",
      padding: "2px 0 10px",
      borderBottom: "1px solid var(--rule)"
    }
  }, title), options.map((o, i) => /*#__PURE__*/React.createElement("button", {
    key: o.value ?? i,
    onClick: () => onPick(o.value),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      width: "100%",
      textAlign: "left",
      background: "none",
      border: "none",
      borderBottom: "1px solid var(--rule)",
      padding: "13px 2px",
      minHeight: 46,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: "var(--font-sans)",
      fontSize: 15,
      fontWeight: o.selected ? 700 : 500,
      color: o.tone === "danger" ? "var(--stamp-alert)" : "var(--text-primary)"
    }
  }, o.label), o.meta && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--text-tertiary)"
    }
  }, o.meta), o.selected && /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16,
    color: "var(--accent-text)"
  }))), destructive && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      color: "var(--text-tertiary)",
      paddingTop: 10
    }
  }, destructive), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "md",
    fullWidth: true,
    onClick: onClose,
    style: {
      marginTop: 12
    }
  }, "Close"))));
}

/* CodeBoxes — 8-char household share code, mono boxes (Family Vault) */
function CodeBoxes({
  code = "",
  length = 8,
  size = 36
}) {
  const chars = code.padEnd(length).slice(0, length).split("");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      justifyContent: "center"
    }
  }, chars.map((c, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: size,
      height: size + 6,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "1px solid var(--rule-strong)",
      borderRadius: 6,
      background: "var(--surface-card)",
      fontFamily: "var(--font-mono)",
      fontSize: size * 0.48,
      fontWeight: 700,
      color: c.trim() ? "var(--text-primary)" : "var(--text-disabled)"
    }
  }, c.trim() || "·")));
}
Object.assign(window, {
  SectionHead,
  ColumnHeads,
  LedgerLine,
  Stamp,
  TearEdge,
  SkeletonRow,
  BottomSheetLite,
  CodeBoxes
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Ledger.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/OnboardingScreen.jsx
try { (() => {
/* Zeno — Onboarding: 3 beats, skippable, → Login with local-only first-class.
   SLOP AUDIT — ① Zeno: ledger rows print in beat 1; defiant type beat 2; stamp beat 3.
   ② Tempted by: center-hero + gradient CTA per beat → instead: asymmetric editorial
   type, ink panel only on beat 1. ③ Lazy version: 6-screen tutorial with mascots.
   MOTION: beats crossfade+settle (spring d22); rows print (45ms stagger);
   splash handoff: navy splash logo → beat 1 renders same mark top-left, settles
   from scale 1.15 (expo-splash-screen fade). Reduced motion: fades. */
function OnboardingScreen({
  onComplete
}) {
  const [step, setStep] = React.useState(0); // 0..2 beats, 3 login, 4 launchpad
  const [age, setAge] = React.useState(false);
  const skip = () => setStep(3);
  const Ticks = () => /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 5
    }
  }, [0, 1, 2].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 16,
      height: 2.5,
      background: i <= step ? "var(--accent)" : "var(--rule-strong)"
    }
  })));
  const beatShell = (children, cta = "Continue") => /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 24px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/zeno-mark.svg",
    width: "26",
    height: "26",
    style: {
      color: "var(--ink-900)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 19,
      letterSpacing: "-0.02em"
    }
  }, "zeno")), /*#__PURE__*/React.createElement("button", {
    onClick: skip,
    style: {
      background: "none",
      border: "none",
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: "0.16em",
      color: "var(--text-tertiary)",
      cursor: "pointer",
      padding: 10
    }
  }, "SKIP")), children, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      padding: "0 24px 30px",
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Ticks, null), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: () => setStep(s => s + 1)
  }, cta)));
  if (step === 0) {
    const rows = [["Netflix", "$15.99"], ["Spotify", "$10.99"], ["ChatGPT Plus", "$20.00"], ["iCloud+", "$2.99"], ["Figma", "$12.00"]];
    return beatShell(/*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 24px"
      }
    }, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 34,
        lineHeight: 1.06,
        letterSpacing: "-0.028em",
        margin: "0 0 22px",
        textWrap: "balance"
      }
    }, "Every subscription.", /*#__PURE__*/React.createElement("br", null), "One honest ledger."), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: "1px solid var(--rule-strong)",
        paddingTop: 4
      }
    }, rows.map(([n, a], i) => /*#__PURE__*/React.createElement("div", {
      key: n,
      className: "zn-print",
      style: {
        animationDelay: `${i * 120 + 200}ms`
      }
    }, /*#__PURE__*/React.createElement(LedgerLine, {
      label: n,
      value: a
    }))), /*#__PURE__*/React.createElement("div", {
      className: "zn-print",
      style: {
        animationDelay: "820ms",
        borderTop: "1px solid var(--rule-strong)",
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement(LedgerLine, {
      label: "Committed",
      strong: true,
      value: "$61.97 /mo",
      valueColor: "var(--accent-text)"
    })))));
  }
  if (step === 1) {
    return beatShell(/*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 24px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.2em",
        color: "var(--accent-text)",
        marginBottom: 14
      }
    }, "UNLIKE THE OTHERS"), /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 40,
        lineHeight: 1.04,
        letterSpacing: "-0.03em",
        margin: "0 0 16px"
      }
    }, "No bank login required."), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 15.5,
        color: "var(--text-secondary)",
        lineHeight: 1.55,
        margin: 0,
        maxWidth: "30ch"
      }
    }, "Zeno reads receipts you show it \u2014 an email scan you start, or a statement you export yourself. Never your credentials.")));
  }
  if (step === 2) {
    return beatShell(/*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 24px"
      }
    }, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 34,
        lineHeight: 1.06,
        letterSpacing: "-0.028em",
        margin: "0 0 18px"
      }
    }, "Warned before every charge."), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 15,
        color: "var(--text-secondary)",
        lineHeight: 1.55,
        margin: "0 0 26px",
        maxWidth: "30ch"
      }
    }, "7 days out, 3 days out, day of. Trials get flagged before they convert. Cancellations get verified \u2014 not assumed.")), "Sign in");
  }
  if (step === 3) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "10px 24px 0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.18em",
        color: "var(--text-tertiary)",
        marginBottom: 6
      }
    }, "ZENO / SIGN IN"), /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 28,
        letterSpacing: "-0.02em",
        margin: "0 0 20px"
      }
    }, "Open your ledger"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setAge(a => !a),
      style: {
        display: "flex",
        gap: 11,
        alignItems: "flex-start",
        textAlign: "left",
        width: "100%",
        background: "none",
        border: "1px solid var(--rule-strong)",
        borderRadius: "var(--radius-md)",
        padding: "12px 14px",
        cursor: "pointer",
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 22,
        height: 22,
        flex: "none",
        borderRadius: 5,
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
    }, "I'm ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: "var(--text-primary)"
      }
    }, "16 or older"), " and accept the Terms & Privacy Policy.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10,
        opacity: age ? 1 : 0.4,
        pointerEvents: age ? "auto" : "none",
        transition: "opacity var(--dur) var(--ease-out)"
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: () => setStep(4),
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "mail",
        size: 18
      })
    }, "Email me a sign-in code"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "lg",
      onClick: () => setStep(4),
      style: {
        flex: 1
      },
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "apple",
        size: 18
      })
    }, "Apple"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "lg",
      onClick: () => setStep(4),
      style: {
        flex: 1
      },
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "globe",
        size: 18
      })
    }, "Google")), /*#__PURE__*/React.createElement(SectionHead, {
      pad: "14px 0 8px"
    }, "Or keep it on this phone"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "lg",
      fullWidth: true,
      onClick: () => setStep(4),
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "smartphone",
        size: 18
      }),
      style: {
        borderColor: "var(--ink-400)",
        borderWidth: 1.5
      }
    }, "Continue without an account"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12.5,
        color: "var(--text-tertiary)",
        textAlign: "center",
        lineHeight: 1.5
      }
    }, "No email, no sync \u2014 your ledger exists only here."))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: "none",
        padding: "12px 24px 26px",
        borderTop: "1px solid var(--rule)"
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 11.5,
        color: "var(--text-tertiary)",
        margin: 0,
        lineHeight: 1.5,
        textAlign: "center"
      }
    }, "Your subscriptions live on your phone, encrypted. Nothing leaves it unless you turn on a cloud feature \u2014 and we ask first.")));
  }

  // step 4 — first-discovery launchpad (first scan free, no paywall before value)
  const methods = [{
    id: "csv",
    icon: "file-spreadsheet",
    title: "Import a statement",
    body: "Export a CSV from your bank yourself — most complete picture.",
    tag: "RECOMMENDED"
  }, {
    id: "email",
    icon: "mail-search",
    title: "Scan email receipts",
    body: "A scan you start, read on this phone. Last 12 months."
  }, {
    id: "manual",
    icon: "pencil-line",
    title: "Add by hand",
    body: "600+ services with autocomplete, or fully custom."
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      padding: "10px 24px 0",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.18em",
      color: "var(--text-tertiary)",
      marginBottom: 6
    }
  }, "FIRST ENTRY"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 27,
      letterSpacing: "-0.022em",
      margin: "0 0 8px",
      textWrap: "balance"
    }
  }, "Let's write the first line"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      color: "var(--text-secondary)",
      margin: "0 0 18px",
      lineHeight: 1.5
    }
  }, "Your first scan is free. Zeno scans only when you tap scan \u2014 nothing runs in the background."), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--rule-strong)"
    }
  }, methods.map((m, i) => /*#__PURE__*/React.createElement("button", {
    key: m.id,
    onClick: () => onComplete(m.id),
    className: "zn-print",
    style: {
      animationDelay: `${i * 90}ms`,
      display: "flex",
      gap: 13,
      alignItems: "center",
      textAlign: "left",
      width: "100%",
      background: "none",
      border: "none",
      borderBottom: "1px solid var(--rule)",
      padding: "15px 2px",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 42,
      height: 42,
      flex: "none",
      border: "1px solid var(--rule-strong)",
      borderRadius: "var(--radius-sm)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--surface-card)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon,
    size: 20,
    color: "var(--text-secondary)"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 700,
      fontSize: 15,
      color: "var(--text-primary)",
      letterSpacing: "-0.01em"
    }
  }, m.title), m.tag && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 8.5,
      fontWeight: 700,
      letterSpacing: "0.14em",
      color: "var(--accent-text)"
    }
  }, m.tag)), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      color: "var(--text-tertiary)",
      marginTop: 2,
      lineHeight: 1.4
    }
  }, m.body)), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 17,
    color: "var(--text-tertiary)"
  })))), /*#__PURE__*/React.createElement("button", {
    onClick: () => onComplete(null),
    style: {
      marginTop: "auto",
      marginBottom: 26,
      background: "none",
      border: "none",
      color: "var(--text-tertiary)",
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.14em",
      cursor: "pointer",
      padding: "16px 0 10px"
    }
  }, "LATER"));
}
window.OnboardingScreen = OnboardingScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/OnboardingScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/PaywallScreen.jsx
try { (() => {
/* Zeno — Paywall: proud, not pushy. True Pro gates only (unlimited past 10,
   category budgets, envelopes). Free tier listed FIRST as a flex. Real prices.
   No fake urgency, no guilt decline, nothing pre-selected but the honest default.
   SLOP AUDIT — ① Zeno: pricing as ledger lines; "free forever" printed above
   the paid tiers; lifetime framed as the defiant option. ② Tempted by:
   feature-checkmark wall + SAVE 40% ribbon → honest computed save note.
   ③ Lazy: gradient hero + social proof carousel + guilt decline. */
function PaywallScreen({
  onClose,
  reason
}) {
  const [plan, setPlan] = React.useState("annual");
  const [done, setDone] = React.useState(false);
  const plans = [{
    id: "monthly",
    label: "Monthly",
    price: "$3.99",
    meta: "/mo"
  }, {
    id: "annual",
    label: "Annual",
    price: "$29.99",
    meta: "/yr",
    note: "SAVE 37% VS MONTHLY"
  }, {
    id: "lifetime",
    label: "Lifetime",
    price: "$79.99",
    meta: "once",
    note: "ONCE. EVER. — YNAB IS $109 EVERY YEAR"
  }, {
    id: "family",
    label: "Family",
    price: "$6.99",
    meta: "/mo",
    note: "UP TO 5 PEOPLE"
  }];
  if (done) {
    return /*#__PURE__*/React.createElement(Sheet, {
      title: "",
      onClose: onClose,
      footer: /*#__PURE__*/React.createElement(Button, {
        variant: "primary",
        size: "lg",
        fullWidth: true,
        onClick: onClose
      }, "Back to the ledger")
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        padding: "40px 0 8px"
      }
    }, /*#__PURE__*/React.createElement(Stamp, {
      animate: true,
      size: "lg",
      angle: -5,
      sub: "7-DAY TRIAL \xB7 CANCEL ANYTIME"
    }, "Pro \u2014 Paid")), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        color: "var(--text-secondary)",
        textAlign: "center",
        lineHeight: 1.55,
        margin: "18px auto 0",
        maxWidth: "30ch"
      }
    }, "Thank you. Unlimited entries, category budgets and envelopes are open. Cancelling is one tap in Settings \u2014 we mean it."));
  }
  return /*#__PURE__*/React.createElement(Sheet, {
    title: "ZENO PRO",
    onClose: onClose,
    footer: /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Button, {
      variant: "money",
      size: "lg",
      fullWidth: true,
      onClick: () => setDone(true)
    }, "Start 7-day free trial"), /*#__PURE__*/React.createElement("button", {
      onClick: onClose,
      style: {
        display: "block",
        width: "100%",
        background: "none",
        border: "none",
        padding: "12px 0 0",
        fontFamily: "var(--font-sans)",
        fontSize: 13.5,
        fontWeight: 600,
        color: "var(--text-tertiary)",
        cursor: "pointer"
      }
    }, "Not now"))
  }, reason && /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13.5,
      color: "var(--text-secondary)",
      margin: "6px 0 0",
      lineHeight: 1.5
    }
  }, reason), /*#__PURE__*/React.createElement(SectionHead, {
    pad: "18px 0 8px"
  }, "Free forever \u2014 already yours"), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingBottom: 2
    }
  }, ["10 tracked subscriptions", "Renewal & trial alerts", "Cancel guides + verification", "Insights & the Spend Coach"].map(f => /*#__PURE__*/React.createElement("div", {
    key: f,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "5px 0"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 14,
    color: "var(--text-tertiary)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13.5,
      color: "var(--text-secondary)"
    }
  }, f)))), /*#__PURE__*/React.createElement(SectionHead, {
    pad: "18px 0 8px"
  }, "Pro adds"), /*#__PURE__*/React.createElement("div", null, ["Unlimited subscriptions", "Category budgets", "Envelope budgeting"].map(f => /*#__PURE__*/React.createElement("div", {
    key: f,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "5px 0"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 15,
    color: "var(--accent-text)",
    strokeWidth: 2.6
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 14.5,
      fontWeight: 650,
      color: "var(--text-primary)"
    }
  }, f))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "5px 0"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield-check",
    size: 15,
    color: "var(--accent-text)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13.5,
      color: "var(--text-secondary)"
    }
  }, "No bank login, ever."))), /*#__PURE__*/React.createElement(SectionHead, {
    pad: "18px 0 8px"
  }, "Pick a plan"), /*#__PURE__*/React.createElement("div", null, plans.map(p => {
    const on = plan === p.id;
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      onClick: () => setPlan(p.id),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        textAlign: "left",
        background: on ? "var(--surface-card)" : "none",
        border: "none",
        borderBottom: "1px solid var(--rule)",
        borderLeft: `3px solid ${on ? "var(--accent)" : "transparent"}`,
        padding: "13px 10px",
        cursor: "pointer",
        minHeight: 52
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block",
        fontFamily: "var(--font-sans)",
        fontWeight: on ? 750 : 600,
        fontSize: 15,
        color: "var(--text-primary)"
      }
    }, p.label), p.note && /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block",
        fontFamily: "var(--font-mono)",
        fontSize: 8.5,
        letterSpacing: "0.12em",
        color: p.id === "lifetime" ? "var(--accent-text)" : "var(--text-tertiary)",
        marginTop: 3
      }
    }, p.note)), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        flex: "none",
        width: 30,
        borderBottom: "2px dotted var(--rule-strong)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: "none",
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: 15.5,
        color: "var(--text-primary)",
        fontFeatureSettings: "'tnum' 1"
      }
    }, p.price, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10.5,
        fontWeight: 500,
        color: "var(--text-tertiary)"
      }
    }, " ", p.meta)));
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 11.5,
      color: "var(--text-tertiary)",
      margin: "14px 0 0",
      textAlign: "center"
    }
  }, "Prices from the App Store at purchase time. Restore purchases \xB7 Terms \xB7 Privacy"));
}
window.PaywallScreen = PaywallScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/PaywallScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/SettingsScreen.jsx
try { (() => {
/* Zeno — Settings. Ledger groups, designed bottom sheets replacing system
   alerts (currency, quiet hours, destructive confirms). Privacy & exit are
   dignified, top-level, and easy — the anti-dark-pattern flex.
   SLOP AUDIT — ① Zeno: bottom sheets with tear edges; required privacy
   sentence set like a pull-quote, not fine print. ② Tempted by: colored
   icon-tile grid rows → plain rows with small ink glyphs. ③ Lazy: iOS
   settings clone with chevrons everywhere. */
function SettingsScreen({
  dark,
  onToggleDark,
  onUpgrade,
  onBack,
  onSecurity,
  onFamily,
  onWidgets
}) {
  const [reminders, setReminders] = React.useState(true);
  const [sheet, setSheet] = React.useState(null); // 'currency' | 'quiet' | 'delete'
  const [currency, setCurrency] = React.useState("USD $");
  const [quiet, setQuiet] = React.useState("10 PM – 8 AM");
  const Row = ({
    icon,
    title,
    sub,
    trailing,
    onClick,
    danger
  }) => /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "13px 0",
      minHeight: 48,
      borderBottom: "1px solid var(--rule)",
      cursor: onClick ? "pointer" : "default"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 18,
    color: danger ? "var(--stamp-alert)" : "var(--text-secondary)",
    style: {
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: 14.5,
      color: danger ? "var(--stamp-alert)" : "var(--text-primary)"
    }
  }, title), sub && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-mono)",
      fontSize: 9.5,
      letterSpacing: "0.08em",
      color: "var(--text-tertiary)",
      marginTop: 2
    }
  }, sub)), trailing || onClick && /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 16,
    color: "var(--text-tertiary)"
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      paddingBottom: 24
    }
  }, /*#__PURE__*/React.createElement(Masthead, {
    kicker: "THE BACK OFFICE",
    title: "Settings",
    left: onBack ? /*#__PURE__*/React.createElement(IconButton, {
      label: "Back",
      onClick: onBack
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-left",
      size: 24
    })) : null,
    rule: false
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 20px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      paddingBottom: 14,
      borderBottom: "1px solid var(--rule-strong)"
    }
  }, /*#__PURE__*/React.createElement(ServiceAvatar, {
    name: "Alex Rivera",
    color: "var(--cat-teal)",
    size: 44,
    shape: "circle"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 700,
      fontSize: 16
    }
  }, "Alex Rivera"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      letterSpacing: "0.06em",
      color: "var(--text-tertiary)",
      marginTop: 2
    }
  }, "LOCAL LEDGER \xB7 NO ACCOUNT")), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: onUpgrade
  }, "Free \xB7 8/10"))), /*#__PURE__*/React.createElement(SectionHead, null, "Notifications"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px"
    }
  }, /*#__PURE__*/React.createElement(Row, {
    icon: "bell",
    title: "Renewal reminders",
    sub: "7D \xB7 3D \xB7 DAY OF",
    trailing: /*#__PURE__*/React.createElement(Switch, {
      checked: reminders,
      onChange: setReminders,
      size: "sm"
    })
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "moon-star",
    title: "Quiet hours",
    sub: quiet.toUpperCase(),
    onClick: () => setSheet("quiet")
  })), /*#__PURE__*/React.createElement(SectionHead, null, "The app"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px"
    }
  }, /*#__PURE__*/React.createElement(Row, {
    icon: "moon",
    title: "Dark mode",
    sub: "THE 11PM LEDGER",
    trailing: /*#__PURE__*/React.createElement(Switch, {
      checked: dark,
      onChange: onToggleDark,
      size: "sm"
    })
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "circle-dollar-sign",
    title: "Home currency",
    sub: `TOTALS SHOWN IN ${currency.toUpperCase()}`,
    onClick: () => setSheet("currency")
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "mail-search",
    title: "Connected inboxes",
    sub: "1 CONNECTED \xB7 REVOCABLE",
    onClick: () => {}
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "lock",
    title: "App lock",
    sub: "PIN + FACE ID",
    onClick: onSecurity
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "users",
    title: "Family Vault",
    sub: "SHARE TOTALS ONLY",
    onClick: onFamily
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "layout-grid",
    title: "Widgets & Watch",
    sub: "PREVIEW \u2014 COMING SOON",
    onClick: onWidgets
  })), /*#__PURE__*/React.createElement(SectionHead, null, "Data & privacy"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px"
    }
  }, /*#__PURE__*/React.createElement("blockquote", {
    style: {
      margin: "4px 0 10px",
      padding: "2px 0 2px 14px",
      borderLeft: "3px solid var(--accent)",
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      lineHeight: 1.6,
      color: "var(--text-primary)"
    }
  }, "Your subscriptions live on your phone, encrypted. Nothing leaves it unless you turn on a cloud feature \u2014 and we ask first."), /*#__PURE__*/React.createElement(Row, {
    icon: "download",
    title: "Export my data",
    sub: "EVERYTHING, AS CSV \u2014 YOURS",
    onClick: () => {}
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "trash-2",
    title: "Delete all my data",
    sub: "ERASES THIS LEDGER",
    onClick: () => setSheet("delete"),
    danger: true
  })), /*#__PURE__*/React.createElement(SectionHead, null, "Account"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px"
    }
  }, /*#__PURE__*/React.createElement(Row, {
    icon: "credit-card",
    title: "Plan & billing",
    sub: "FREE",
    onClick: onUpgrade
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "circle-help",
    title: "Help & feedback",
    onClick: () => {}
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "log-out",
    title: "Sign out",
    onClick: () => {}
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "file-x",
    title: "Cancel my Zeno account",
    sub: "ONE TAP. NO RETENTION MAZE.",
    onClick: () => {},
    danger: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 20px 0",
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      letterSpacing: "0.14em",
      color: "var(--text-disabled)"
    }
  }, "ZENO 1.4.0 \xB7 MADE WITH CARE FOR PEOPLE WHO HATE SURPRISE CHARGES")), sheet === "currency" && /*#__PURE__*/React.createElement(BottomSheetLite, {
    title: "HOME CURRENCY",
    onClose: () => setSheet(null),
    options: [["USD $"], ["EUR €"], ["GBP £"], ["CAD $"]].map(([c]) => ({
      label: c,
      value: c,
      selected: currency === c
    })),
    onPick: c => {
      setCurrency(c);
      setSheet(null);
    }
  }), sheet === "quiet" && /*#__PURE__*/React.createElement(BottomSheetLite, {
    title: "QUIET HOURS",
    onClose: () => setSheet(null),
    options: [{
      label: "10 PM – 8 AM",
      value: "10 PM – 8 AM",
      selected: quiet === "10 PM – 8 AM"
    }, {
      label: "9 PM – 9 AM",
      value: "9 PM – 9 AM",
      selected: quiet === "9 PM – 9 AM"
    }, {
      label: "Off — alert any time",
      value: "Off"
    }],
    onPick: v => {
      setQuiet(v);
      setSheet(null);
    }
  }), sheet === "delete" && /*#__PURE__*/React.createElement(BottomSheetLite, {
    title: "DELETE ALL DATA?",
    onClose: () => setSheet(null),
    destructive: "This erases every entry on this phone. There is no cloud copy unless you enabled sync. This cannot be undone.",
    options: [{
      label: "Delete everything",
      value: "del",
      tone: "danger"
    }],
    onPick: () => setSheet(null)
  }));
}
window.SettingsScreen = SettingsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/SettingsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/SubscriptionDetailScreen.jsx
try { (() => {
/* Zeno — Subscription detail: the account page. Ledger lines for facts,
   a real charge-history table, stamps for verified/attention states.
   SLOP AUDIT — ① Zeno: charge history with column heads + leader dots;
   cancelled state = rotated stamp over the header. ② Tempted by: stat-card
   trio under a glowing avatar → LedgerLines on rules instead. ③ Lazy version:
   hero card + 3 stat tiles + generic list. */
function SubscriptionDetailScreen({
  id,
  onBack,
  onCancel
}) {
  const s = window.ZENO.subscriptions.find(x => x.id === id) || window.ZENO.subscriptions[0];
  const [reminder, setReminder] = React.useState(true);
  const yearly = (s.amount * 12).toFixed(2);
  const billing = ["active", "trial"].includes(s.status);
  const banner = {
    pending: ["var(--info)", "clock", "Awaiting proof", `You reported this cancelled ${s.cancelledOn}. Zeno checks your next receipt or statement around ${s.next} before believing it.`],
    attention: ["var(--stamp-alert)", "triangle-alert", "Still being charged", `A $${s.amount.toFixed(2)} charge appeared after you cancelled. The cancellation didn't stick.`],
    trial: ["var(--warning)", "alarm-clock", "Trial converts in 2 days", `Becomes $${s.amount.toFixed(2)}/mo on ${s.trialEnds}. Cancel before then and pay nothing.`]
  }[s.status];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      overflowX: "hidden",
      paddingBottom: 24
    }
  }, /*#__PURE__*/React.createElement(ScreenHeader, {
    title: s.category.toUpperCase(),
    left: /*#__PURE__*/React.createElement(IconButton, {
      label: "Back",
      onClick: onBack
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-left",
      size: 24
    })),
    right: /*#__PURE__*/React.createElement(IconButton, {
      label: "Edit"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "pencil-line",
      size: 19
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 20px 0",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(ServiceAvatar, {
    name: s.name,
    color: s.color,
    size: 54
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 26,
      letterSpacing: "-0.02em",
      color: "var(--text-primary)",
      lineHeight: 1.05
    }
  }, s.name), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 5
    }
  }, /*#__PURE__*/React.createElement(StatusPill, {
    status: s.status
  }))), s.status === "cancelled" && /*#__PURE__*/React.createElement(Stamp, {
    angle: 7,
    size: "md",
    sub: `SAVED $${yearly}/YR`
  }, "Verified")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 8,
      marginTop: 16,
      borderBottom: "1px solid var(--rule-strong)",
      paddingBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: 40,
      letterSpacing: "-0.03em",
      color: s.status === "cancelled" ? "var(--text-disabled)" : "var(--text-primary)",
      fontFeatureSettings: "'tnum' 1",
      textDecoration: s.status === "cancelled" ? "line-through" : "none"
    }
  }, "$", s.amount.toFixed(2)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      color: "var(--text-tertiary)"
    }
  }, "/", s.cadence))), banner && /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "14px 20px 0",
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      borderLeft: `3px solid ${banner[0]}`,
      paddingLeft: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: banner[1],
    size: 15,
    color: banner[0]
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 700,
      fontSize: 14,
      color: "var(--text-primary)"
    }
  }, banner[2])), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      color: "var(--text-secondary)",
      marginTop: 4,
      lineHeight: 1.5
    }
  }, banner[3]), s.status === "attention" && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    size: "sm",
    onClick: () => onCancel(s.id)
  }, "Re-open cancellation")))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 20px 0"
    }
  }, /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Next payment",
    value: billing ? s.next : "—"
  }), /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Billing cycle",
    value: s.cadence === "mo" ? "Monthly" : "Yearly"
  }), /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Per year",
    value: `$${yearly}`
  }), /*#__PURE__*/React.createElement(LedgerLine, {
    label: "Reminders",
    sub: "7D \xB7 3D \xB7 DAY OF",
    value: /*#__PURE__*/React.createElement(Switch, {
      checked: reminder,
      onChange: setReminder,
      size: "sm"
    })
  })), /*#__PURE__*/React.createElement(SectionHead, {
    right: s.history.length > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        color: "var(--text-tertiary)",
        letterSpacing: "0.1em"
      }
    }, s.history.length, " ENTRIES")
  }, "Charge history"), s.history.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "6px 20px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13.5,
      color: "var(--text-tertiary)",
      lineHeight: 1.5
    }
  }, "No charges logged yet. Each one prints here as it happens \u2014 honest history, not sample data.")) : /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px"
    }
  }, /*#__PURE__*/React.createElement(ColumnHeads, {
    left: "DATE",
    right: "AMOUNT",
    style: {
      padding: "0 0 6px"
    }
  }), (s.history.length > 6 ? s.history.slice(0, 6) : s.history).map(([date, amt], i) => {
    const hike = s.priceHike && amt === s.priceHike.to && i === s.history.findIndex(h => h[1] === s.priceHike.to);
    return /*#__PURE__*/React.createElement("div", {
      key: date,
      className: "zn-print",
      style: {
        animationDelay: `${i * 40}ms`
      }
    }, /*#__PURE__*/React.createElement(LedgerLine, {
      label: /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: "var(--font-mono)",
          fontSize: 12.5,
          letterSpacing: "0.03em",
          color: "var(--text-secondary)"
        }
      }, date.toUpperCase()),
      sub: hike ? "PRICE ROSE" : undefined,
      value: `$${amt.toFixed(2)}`,
      valueColor: hike ? "var(--info)" : "var(--text-primary)"
    }));
  }), s.history.length > 6 && /*#__PURE__*/React.createElement("button", {
    style: {
      background: "none",
      border: "none",
      padding: "10px 0",
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.14em",
      color: "var(--accent-text)",
      cursor: "pointer"
    }
  }, "ALL ", s.history.length, " ENTRIES \u2193")), billing && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      padding: "24px 20px 0"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    fullWidth: true,
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "pause",
      size: 17
    })
  }, "Pause \u2014 keep the history"), /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    size: "lg",
    fullWidth: true,
    onClick: () => onCancel(s.id),
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "scissors",
      size: 17
    })
  }, "Cancel this subscription")));
}
window.SubscriptionDetailScreen = SubscriptionDetailScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/SubscriptionDetailScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/SubscriptionsScreen.jsx
try { (() => {
/* Zeno — Subscriptions: the full ledger. Column heads, text-tab filters,
   status tick-tags, verified rows carry a mini stamp.
   SLOP AUDIT — ① Zeno: real table column heads (SERVICE/AMOUNT), leader dots,
   caps-mono filters with underline ticks. ② Tempted by: pill filter chips +
   card-wrapped list → text tabs + rules on paper instead. ③ Lazy version:
   search bar + pills + rounded card list, same as every tracker. */
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
    All: ["Nothing on the books", "Run a scan or add a line yourself."],
    Active: ["No active entries", "Anything currently billing lands here."],
    Paused: ["Nothing paused", "Paused entries keep their history."],
    Pending: ["Nothing awaiting proof", "Cancellations being verified land here."],
    Cancelled: ["No verified cancellations yet", "Your proof-of-work page. It fills up."]
  }[filter];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(Masthead, {
    kicker: `${billing.length} BILLING · $${total.toFixed(2)}/MO`,
    title: "Subscriptions",
    right: /*#__PURE__*/React.createElement(IconButton, {
      label: "Add",
      onClick: onAdd
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 20
    })),
    rule: false
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 20px 0",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(Input, {
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 17
    }),
    placeholder: "Search the ledger",
    value: q,
    onChange: e => setQ(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "no-scrollbar",
    style: {
      display: "flex",
      gap: 14,
      padding: "14px 20px 0",
      overflowX: "auto",
      scrollbarWidth: "none",
      flex: "none",
      borderBottom: "1px solid var(--rule-strong)"
    }
  }, filters.map(f => {
    const on = filter === f;
    const count = f === "All" ? Z.subscriptions.length : Z.subscriptions.filter(s => statusFor[f].includes(s.status)).length;
    return /*#__PURE__*/React.createElement("button", {
      key: f,
      onClick: () => setFilter(f),
      style: {
        flex: "none",
        background: "none",
        border: "none",
        padding: "4px 0 9px",
        cursor: "pointer",
        position: "relative",
        display: "flex",
        alignItems: "baseline",
        gap: 5
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: on ? "var(--text-primary)" : "var(--text-tertiary)"
      }
    }, f), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        color: on ? "var(--accent-text)" : "var(--text-disabled)"
      }
    }, count), /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: -1,
        height: 2.5,
        background: on ? "var(--accent)" : "transparent"
      }
    }));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      paddingBottom: 24
    }
  }, list.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "56px 32px",
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.18em",
      color: "var(--text-tertiary)",
      marginBottom: 8
    }
  }, "EMPTY PAGE"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 20,
      color: "var(--text-primary)",
      marginBottom: 5
    }
  }, emptyCopy[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13.5,
      color: "var(--text-secondary)"
    }
  }, emptyCopy[1]), filter === "All" && /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "md",
    onClick: onAdd,
    style: {
      marginTop: 18
    }
  }, "Add a subscription")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ColumnHeads, {
    left: "SERVICE",
    right: "AMOUNT / NEXT",
    style: {
      margin: "14px 6px 0"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 6px"
    }
  }, list.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    className: "zn-print",
    style: {
      animationDelay: `${Math.min(i, 8) * 45}ms`
    }
  }, /*#__PURE__*/React.createElement(ListRow, {
    divider: i < list.length - 1,
    leading: /*#__PURE__*/React.createElement(ServiceAvatar, {
      name: s.name,
      color: s.color,
      size: 38,
      style: ["paused", "cancelled"].includes(s.status) ? {
        opacity: 0.45
      } : null
    }),
    title: /*#__PURE__*/React.createElement("span", {
      style: ["paused", "cancelled"].includes(s.status) ? {
        color: "var(--text-tertiary)"
      } : null
    }, s.name),
    subtitle: s.status === "active" ? s.category.toUpperCase() : /*#__PURE__*/React.createElement(StatusPill, {
      status: s.status
    }),
    trailing: s.status === "cancelled" ? /*#__PURE__*/React.createElement(Stamp, {
      size: "sm",
      angle: -4
    }, "Verified") : s.status === "attention" ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        fontWeight: 700,
        color: "var(--stamp-alert)"
      }
    }, "$", s.amount.toFixed(2), " !") : /*#__PURE__*/React.createElement("span", {
      style: {
        textAlign: "right"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block",
        fontFamily: "var(--font-mono)",
        fontSize: 14.5,
        fontWeight: 700,
        color: "var(--text-primary)",
        fontFeatureSettings: "'tnum' 1"
      }
    }, "$", s.amount.toFixed(2)), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        letterSpacing: "0.06em",
        color: "var(--text-tertiary)",
        marginTop: 1
      }
    }, s.status === "paused" ? "PAUSED" : s.next.toUpperCase())),
    onClick: () => onOpen(s.id)
  })))))));
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
  freeLimit: 10,
  catalog: ["Netflix", "Spotify", "YouTube Premium", "Disney+", "ChatGPT Plus", "Notion", "iCloud+", "Figma", "Amazon Prime", "Hulu", "Max", "Audible", "Dropbox", "Adobe CC", "Headspace", "Duolingo", "NordVPN", "Patreon", "Twitch", "Apple Music"]
};

// Active = anything currently billing (active/trial). Used for "monthly total".
window.ZENO.activeSubs = window.ZENO.subscriptions.filter(s => s.status === "active");
window.ZENO.monthlyTotal = window.ZENO.activeSubs.reduce((a, s) => a + s.amount, 0);
// Counts toward the free-tier limit: anything being tracked for billing (paused excluded).
window.ZENO.trackedCount = window.ZENO.subscriptions.filter(s => ["active", "trial", "pending", "attention"].includes(s.status)).length;

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
