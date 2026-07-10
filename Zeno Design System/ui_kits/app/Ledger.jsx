/* Zeno Ledger Kit — the named signature elements of "The Honest Ledger".
   ① LedgerLine  ② Stamp  ③ SectionHead / ColumnHeads  ④ print-in (zn-print)
   Plus: SheetShell (tear-edge receipt), BottomSheetLite, SkeletonRow, CodeBoxes.
   Every element here appears on 3+ screens — that's the contract. */

/* ③ SectionHead — caps-mono ledger column head with trailing hairline */
function SectionHead({ children, right, pad = "26px 20px 10px" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: pad }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>{children}</span>
      <span style={{ flex: 1, borderBottom: "1px solid var(--rule)" }}></span>
      {right}
    </div>
  );
}

/* ③b ColumnHeads — table header for ledger lists ("SERVICE … AMOUNT") */
function ColumnHeads({ left, right, style }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0 14px 6px", borderBottom: "1px solid var(--rule-strong)", ...style }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: "var(--text-tertiary)" }}>{left}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: "var(--text-tertiary)" }}>{right}</span>
    </div>
  );
}

/* ① LedgerLine — label ……… mono value. The signature row. */
function LedgerLine({ label, sub, value, valueColor = "var(--text-primary)", strong = false, size = 14, onClick, style }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "7px 0", cursor: onClick ? "pointer" : "default", ...style }}>
      <span style={{ flex: "none", fontFamily: "var(--font-sans)", fontSize: size, fontWeight: strong ? 700 : 500, color: strong ? "var(--text-primary)" : "var(--text-secondary)" }}>
        {label}
        {sub && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", marginLeft: 8, letterSpacing: "0.04em" }}>{sub}</span>}
      </span>
      <span aria-hidden="true" style={{ flex: 1, borderBottom: "2px dotted var(--rule-strong)", transform: "translateY(-3px)", minWidth: 14 }}></span>
      <span style={{ flex: "none", fontFamily: "var(--font-mono)", fontSize: size + 1, fontWeight: 700, color: valueColor, fontFeatureSettings: "'tnum' 1", letterSpacing: "-0.01em" }}>{value}</span>
    </div>
  );
}

/* ② The Zeno Stamp — inked verification mark. Thunks down (zn-stamp).
   RN: withSpring(scale 1.7→1, damping 14, stiffness 420) + Haptics.notificationAsync(Success).
   Reduced motion: fades in. */
function Stamp({ tone = "verified", children, sub, angle = -5, size = "md", animate = false, style }) {
  const color = tone === "alert" ? "var(--stamp-alert)" : tone === "neutral" ? "var(--ink-400)" : "var(--stamp-verified)";
  const dims = size === "lg" ? { fs: 17, pad: "14px 22px", sub: 10 } : size === "sm" ? { fs: 10, pad: "4px 9px", sub: 8 } : { fs: 13, pad: "9px 16px", sub: 9 };
  return (
    <span className={animate ? "zn-stamp" : ""} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 3, padding: dims.pad, border: `2.5px solid ${color}`, outline: `1px solid ${color}`, outlineOffset: 2.5, borderRadius: 6, color, transform: `rotate(${angle}deg)`, opacity: 0.94, "--stamp-angle": `${angle}deg`, fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", whiteSpace: "nowrap", ...style }}>
    <span style={{ fontSize: dims.fs, lineHeight: 1 }}>{children}</span>
      {sub && <span style={{ fontSize: dims.sub, letterSpacing: "0.2em", opacity: 0.75 }}>{sub}</span>}
    </span>
  );
}

/* SheetShell — receipt torn off the roll: zig-zag tear edge at the top */
function TearEdge({ flip = false, color = "var(--surface-card)" }) {
  const grad = `linear-gradient(${flip ? 135 : -45}deg, ${color} 6px, transparent 0), linear-gradient(${flip ? -135 : 45}deg, ${color} 6px, transparent 0)`;
  return <div aria-hidden="true" style={{ height: 9, flex: "none", background: grad, backgroundSize: "14px 14px", backgroundRepeat: "repeat-x", transform: flip ? "scaleY(-1)" : "none" }}></div>;
}

/* SkeletonRow — shimmer placeholder (loading states). RN: moti/Reanimated loop. */
function SkeletonRow({ width = "100%", height = 14, style }) {
  return <div style={{ width, height, borderRadius: 4, background: "linear-gradient(90deg, var(--surface-sunken) 25%, var(--ink-75) 50%, var(--surface-sunken) 75%)", backgroundSize: "200px 100%", animation: "zn-shimmer 1.1s linear infinite", ...style }}></div>;
}

/* BottomSheetLite — designed replacement for system Alert pickers (F3).
   variant: options list or destructive confirm. RN: @gorhom/bottom-sheet. */
function BottomSheetLite({ title, options, onPick, onClose, destructive }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "var(--overlay)" }}></div>
      <div className="zn-sheet" style={{ position: "relative", display: "flex", flexDirection: "column" }}>
        <TearEdge />
        <div style={{ background: "var(--surface-card)", padding: "14px 20px 30px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-tertiary)", padding: "2px 0 10px", borderBottom: "1px solid var(--rule)" }}>{title}</div>
          {options.map((o, i) => (
            <button key={o.value ?? i} onClick={() => onPick(o.value)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid var(--rule)", padding: "13px 2px", minHeight: 46, cursor: "pointer" }}>
              <span style={{ flex: 1, fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: o.selected ? 700 : 500, color: o.tone === "danger" ? "var(--stamp-alert)" : "var(--text-primary)" }}>{o.label}</span>
              {o.meta && <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)" }}>{o.meta}</span>}
              {o.selected && <Icon name="check" size={16} color="var(--accent-text)" />}
            </button>
          ))}
          {destructive && (
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-tertiary)", paddingTop: 10 }}>{destructive}</div>
          )}
          <Button variant="ghost" size="md" fullWidth onClick={onClose} style={{ marginTop: 12 }}>Close</Button>
        </div>
      </div>
    </div>
  );
}

/* CodeBoxes — 8-char household share code, mono boxes (Family Vault) */
function CodeBoxes({ code = "", length = 8, size = 36 }) {
  const chars = code.padEnd(length).slice(0, length).split("");
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {chars.map((c, i) => (
        <span key={i} style={{ width: size, height: size + 6, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--rule-strong)", borderRadius: 6, background: "var(--surface-card)", fontFamily: "var(--font-mono)", fontSize: size * 0.48, fontWeight: 700, color: c.trim() ? "var(--text-primary)" : "var(--text-disabled)" }}>{c.trim() || "·"}</span>
      ))}
    </div>
  );
}

Object.assign(window, { SectionHead, ColumnHeads, LedgerLine, Stamp, TearEdge, SkeletonRow, BottomSheetLite, CodeBoxes });
