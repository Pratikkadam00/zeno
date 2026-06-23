/* Shared iOS chrome for the Zeno app: StatusBar, TabBar, ScreenHeader. */

function StatusBar({ dark = false }) {
  const color = dark ? "#fff" : "var(--ink-900)";
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

function ScreenHeader({ title, left, right, large = false }) {
  return (
    <div style={{ flex: "none", padding: large ? "6px 20px 8px" : "4px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 40 }}>
        <div style={{ display: "flex", alignItems: "center", minWidth: 44 }}>{left}</div>
        {!large && <div style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 17, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{title}</div>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, minWidth: 44 }}>{right}</div>
      </div>
      {large && <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, letterSpacing: "-0.02em", color: "var(--text-primary)", padding: "0 8px" }}>{title}</div>}
    </div>
  );
}

const TABS = [
  { id: "home",     icon: "house",        label: "Home" },
  { id: "subs",     icon: "layers",       label: "Subs" },
  { id: "discover", icon: "plus",         label: "" },
  { id: "calendar", icon: "calendar",     label: "Calendar" },
  { id: "insights", icon: "chart-pie",    label: "Insights" },
];

function TabBar({ active, onTab }) {
  return (
    <div style={{ flex: "none", height: 84, borderTop: "1px solid var(--border-subtle)", background: "color-mix(in srgb, var(--surface-card) 88%, transparent)", backdropFilter: "blur(12px)", display: "flex", alignItems: "flex-start", paddingTop: 10 }}>
      {TABS.map(t => {
        if (t.id === "discover") {
          return (
            <div key={t.id} style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <button onClick={() => onTab("discover")} aria-label="Discover subscriptions" style={{ width: 52, height: 52, marginTop: -6, borderRadius: "var(--radius-pill)", border: "none", background: "var(--accent)", color: "var(--text-on-accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-accent)", cursor: "pointer" }}>
                <Icon name="plus" size={26} color="var(--text-on-accent)" />
              </button>
            </div>
          );
        }
        const on = active === t.id;
        return (
          <button key={t.id} onClick={() => onTab(t.id)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: on ? "var(--accent-text)" : "var(--text-tertiary)" }}>
            <Icon name={t.icon} size={23} color={on ? "var(--accent-text)" : "var(--text-tertiary)"} strokeWidth={on ? 2.4 : 2} />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: on ? 700 : 500 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

window.StatusBar = StatusBar;
window.ScreenHeader = ScreenHeader;
window.TabBar = TabBar;

/* Shared status pill — maps a subscription status to a Badge. */
function StatusPill({ status }) {
  const map = {
    active:    ["success", "Active", true],
    trial:     ["warning", "Free trial", true],
    paused:    ["neutral", "Paused", true],
    pending:   ["info", "Pending verification", false],
    cancelled: ["neutral", "Verified cancelled", false],
    attention: ["danger", "Still charging", false],
  };
  const [tone, label, dot] = map[status] || map.active;
  return <Badge tone={tone} dot={dot}>{label}</Badge>;
}
window.StatusPill = StatusPill;
