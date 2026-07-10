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

function TabBar({ active, onTab }) {
  return (
    <div style={{ flex: "none", height: 86, borderTop: "1px solid var(--rule-strong)", background: "var(--surface-card)", display: "flex", alignItems: "flex-start", paddingTop: 0 }}>
      {TABS.map(t => {
        if (t.id === "discover") {
          return (
            <div key={t.id} style={{ flex: 1, display: "flex", justifyContent: "center", paddingTop: 11 }}>
              <button onClick={() => onTab("discover")} aria-label="Discover subscriptions" style={{ width: 52, height: 52, marginTop: -8, borderRadius: "var(--radius-pill)", border: "none", background: "var(--ink-panel)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-md)", cursor: "pointer", outline: "1px solid var(--rule-strong)", outlineOffset: 3 }}>
                <Icon name="plus" size={26} color="var(--accent)" strokeWidth={2.4} />
              </button>
            </div>
          );
        }
        const on = active === t.id;
        return (
          <button key={t.id} onClick={() => onTab(t.id)} style={{ flex: 1, height: 60, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingTop: 0, color: on ? "var(--text-primary)" : "var(--text-tertiary)", position: "relative" }}>
            {/* overline tick — the ledger index tab */}
            <span style={{ width: 18, height: 2.5, background: on ? "var(--accent)" : "transparent", marginBottom: 7, transition: "background var(--dur-fast) var(--ease-out)" }}></span>
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
