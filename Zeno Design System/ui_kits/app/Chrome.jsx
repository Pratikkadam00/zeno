/* Shared chrome. Ledger language: paper tab bar with hairline rule, active
   tab = overline tick (ledger index tab). Center action = ink seal.
   MOTION: tab switch — icon settles (spring d22 s260); press haptic Light. */

function StatusBar({ dark = false }) {
  const color = dark ? "#fff" : "var(--text-primary)";
  return (
    <div style={{ height: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px 0 32px", flex: "none" }}>
      <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 15, color, letterSpacing: "-0.01em" }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: 7, color }}>
        <Icon name="signal" size={17} color={color} />
        <Icon name="wifi" size={17} color={color} />
        <Icon name="battery-full" size={20} color={color} />
      </div>
    </div>
  );
}

/* Masthead — ledger document header: caps-mono kicker, display title, rule. */
function Masthead({ kicker, title, left, right, rule = true }) {
  return (
    <div style={{ flex: "none", padding: "4px 20px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44 }}>
        {left}
        <div style={{ flex: 1, minWidth: 0 }}>
          {kicker && <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>{kicker}</div>}
          {title && <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, letterSpacing: "-0.02em", color: "var(--text-primary)", marginTop: kicker ? 2 : 0 }}>{title}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>{right}</div>
      </div>
      {rule && <div style={{ borderBottom: "1px solid var(--rule)", marginTop: 10 }}></div>}
    </div>
  );
}

/* Small back/close header for stack screens */
function ScreenHeader({ title, left, right, large = false }) {
  return (
    <div style={{ flex: "none", padding: "4px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
      <div style={{ display: "flex", alignItems: "center", minWidth: 44 }}>{left}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-primary)", whiteSpace: "nowrap" }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, minWidth: 44 }}>{right}</div>
    </div>
  );
}

const TABS = [
  { id: "home",     icon: "book-open",   label: "Ledger" },
  { id: "subs",     icon: "layers",      label: "Subs" },
  { id: "discover", icon: "plus",        label: "" },
  { id: "calendar", icon: "calendar",    label: "Calendar" },
  { id: "insights", icon: "chart-no-axes-column", label: "Insights" },
];

/* Quick-pick arc for the ⊕ long-press — three seals fanned within thumb sweep.
   Top = recommended. tx/ty are offsets from the FAB center. */
const QUICK_ACTIONS = [
  { id: "manual", icon: "pencil-line", label: "ADD BY HAND", tx: -96, ty: -94 },
  { id: "csv", icon: "file-spreadsheet", label: "IMPORT CSV", tx: 0, ty: -134 },
  { id: "email", icon: "mail-search", label: "SCAN EMAIL", tx: 96, ty: -94 },
];

/* TabBar — tap ⊕ opens the Discover hub; HOLD ⊕ (300ms) fans three seals in
   an arc above the thumb while the page behind blurs: sweep onto one,
   release to pick. Release anywhere else cancels. The plus rotates 45°
   while open (release-to-cancel cue).
   MOTION: seals pop out along their vectors (0.24s thunk ease, 40ms stagger;
   RN: withSpring d16 s380 per seal), scrim blur fades in 180ms; hot seal
   inks green + scales 1.12 in 110ms. HAPTICS: impactAsync(Medium) on open,
   selectionAsync() when the hot seal changes, impactAsync(Light) on pick.
   RN: Gesture.LongPress(300) + pan; BlurView for the scrim; reduced motion
   → seals appear in place, scrim opacity only. */
function TabBar({ active, onTab, onQuick }) {
  const [menu, setMenu] = React.useState(false);
  const [held, setHeld] = React.useState(false);
  const [hot, setHot] = React.useState(null);
  const timer = React.useRef(null);
  const opened = React.useRef(false);
  const rowRefs = React.useRef({});

  const hitTest = (x, y) => {
    for (const q of QUICK_ACTIONS) {
      const el = rowRefs.current[q.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 5 && y <= r.bottom + 5) return q.id;
    }
    return null;
  };
  const down = (e) => {
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    setHeld(true);
    opened.current = false;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { opened.current = true; setMenu(true); setHot(null); }, 300);
  };
  const move = (e) => { if (opened.current) setHot(hitTest(e.clientX, e.clientY)); };
  const up = (e) => {
    clearTimeout(timer.current);
    setHeld(false);
    if (opened.current) {
      const pick = hitTest(e.clientX, e.clientY);
      opened.current = false;
      setMenu(false); setHot(null);
      if (pick) { onQuick ? onQuick(pick) : onTab("discover"); }
    } else {
      setMenu(false);
      onTab("discover"); // short tap → full Discover hub (unchanged)
    }
  };
  const cancel = () => { clearTimeout(timer.current); setHeld(false); setMenu(false); setHot(null); opened.current = false; };

  return (
    <div style={{ flex: "none", height: 86, borderTop: "1px solid var(--rule-strong)", background: "var(--surface-card)", display: "flex", alignItems: "flex-start", paddingTop: 0, position: "relative" }}>
      {/* Hold-scrim — the page above softens while the arc is out */}
      {menu && <div style={{ position: "absolute", left: 0, right: 0, bottom: "100%", height: 860, background: "color-mix(in srgb, var(--bg-app) 45%, transparent)", backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)", animation: "qaScrim 0.18s var(--ease-out) both", pointerEvents: "none" }}></div>}
      {TABS.map(t => {
        if (t.id === "discover") {
          return (
            <div key={t.id} style={{ flex: 1, display: "flex", justifyContent: "center", paddingTop: 11, position: "relative" }}>
              {/* Quick arc — anchored on the FAB center */}
              {menu && (
                <div style={{ position: "absolute", left: "50%", top: 29, width: 0, height: 0, zIndex: 30 }}>
                  {QUICK_ACTIONS.map((q, i) => {
                    const on = hot === q.id;
                    return (
                      <div key={q.id} ref={el => { rowRefs.current[q.id] = el; }}
                        style={{ position: "absolute", left: -34, top: -28, width: 68, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transform: `translate(${q.tx}px, ${q.ty}px)`, "--tx": `${q.tx}px`, "--ty": `${q.ty}px`, animation: `qaPop 0.24s var(--ease-thunk) ${i * 40}ms both` }}>
                        <span style={{ width: 56, height: 56, borderRadius: "50%", background: on ? "var(--accent)" : "var(--ink-panel)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-md)", outline: `1px solid ${on ? "var(--accent)" : "var(--rule-strong)"}`, outlineOffset: 3, transform: on ? "scale(1.12)" : "scale(1)", transition: "transform 110ms var(--ease-out), background 90ms linear" }}>
                          <Icon name={q.icon} size={22} color={on ? "var(--ink-panel)" : "#1ED47F"} strokeWidth={2.2} />
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", whiteSpace: "nowrap", color: on ? "var(--paper)" : "var(--text-primary)", background: on ? "var(--ink-panel)" : "color-mix(in srgb, var(--surface-card) 88%, transparent)", border: "1px solid var(--rule)", padding: "3px 8px", borderRadius: 5 }}>{q.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <button
                onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}
                onContextMenu={(e) => e.preventDefault()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onTab("discover"); }}
                aria-label="Discover subscriptions — hold for quick add"
                style={{ width: 52, height: 52, marginTop: -8, borderRadius: "var(--radius-pill)", border: "none", background: "var(--ink-panel)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-md)", cursor: "pointer", outline: "1px solid var(--rule-strong)", outlineOffset: 3, touchAction: "none", transform: held ? "scale(0.93)" : "scale(1)", transition: "transform var(--dur-fast) var(--ease-out)" }}>
                <span style={{ display: "inline-flex", transform: menu ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.2s var(--ease-out)" }}>
                  <Icon name="plus" size={26} color="var(--accent)" strokeWidth={2.4} />
                </span>
              </button>
            </div>
          );
        }
        const on = active === t.id;
        return (
          <button key={t.id} onClick={() => onTab(t.id)} style={{ flex: 1, height: 60, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingTop: 0, color: on ? "var(--text-primary)" : "var(--text-tertiary)", position: "relative" }}>
            {/* overline tick — the ledger index tab (pops when it lands) */}
            <span key={on ? "on" : "off"} style={{ width: 18, height: 2.5, background: on ? "var(--accent)" : "transparent", marginBottom: 7, animation: on ? "zn-grow-x 0.24s var(--ease-out) both" : "none" }}></span>
            <Icon name={t.icon} size={22} color={on ? "var(--text-primary)" : "var(--text-tertiary)"} strokeWidth={on ? 2.3 : 1.8} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: on ? 700 : 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* Status → ledger tick-tag map (uses restyled Badge) */
function StatusPill({ status }) {
  const map = {
    active:    ["success", "Active", false],
    trial:     ["warning", "Trial", true],
    paused:    ["neutral", "Paused", false],
    pending:   ["info", "Verifying", false],
    cancelled: ["success", "Verified ✓", false],
    attention: ["danger", "Still charging", false],
  };
  const [tone, label, hollow] = map[status] || map.active;
  return <Badge tone={tone} hollow={hollow}>{label}</Badge>;
}

window.StatusBar = StatusBar;
window.Masthead = Masthead;
window.ScreenHeader = ScreenHeader;
window.TabBar = TabBar;
window.StatusPill = StatusPill;
