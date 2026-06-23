/* Zeno — Add subscription (CHANGE 5: renewal date is user-editable) */
function AddSubscriptionScreen({ onClose }) {
  const popular = [
    { name: "Netflix", color: "#E50914" }, { name: "Spotify", color: "#1DB954" },
    { name: "YouTube", color: "#FF0000" }, { name: "Disney+", color: "#113CCF" },
    { name: "ChatGPT", color: "#10A37F" }, { name: "Notion", color: "#111111" },
    { name: "iCloud+", color: "#3B82F6" }, { name: "Figma", color: "#A259FF" },
  ];
  const cats = [["Entertainment","violet"],["Music","coral"],["Productivity","blue"],["Shopping","pink"],["Utilities","amber"],["Health","teal"]];
  const [picked, setPicked] = React.useState("Netflix");
  const [cat, setCat] = React.useState("Entertainment");
  const [cadence, setCadence] = React.useState("Monthly");
  const [remind, setRemind] = React.useState(true);
  const [days, setDays] = React.useState(14); // days until next renewal — editable

  const renewalLabel = () => {
    const d = new Date(); d.setDate(d.getDate() + days);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <Sheet title="Add subscription" onClose={onClose}
      footer={<Button variant="primary" size="lg" fullWidth onClick={onClose}>Add subscription</Button>}>
      <Label>Popular</Label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
        {popular.map(p => {
          const on = picked === p.name;
          return (
            <button key={p.name} onClick={() => setPicked(p.name)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "10px 4px", background: "var(--surface-card)", border: `1.5px solid ${on ? "var(--accent)" : "var(--border-subtle)"}`, borderRadius: "var(--radius-md)", cursor: "pointer", boxShadow: on ? "0 0 0 3px var(--focus-ring)" : "none" }}>
              <ServiceAvatar name={p.name} color={p.color} size={36} />
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{p.name}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Input label="Name" value={picked} onChange={e => setPicked(e.target.value)} />
        <Input label="Cost" prefix="$" mono placeholder="0.00" suffix={`/ ${cadence === "Monthly" ? "mo" : "yr"}`} />

        <div>
          <Label>Billing cycle</Label>
          <SegmentedControl options={["Monthly","Yearly"]} value={cadence} onChange={setCadence} />
        </div>

        {/* Editable next-renewal date (was locked to +30 days) */}
        <div>
          <Label>Next renews</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface-card)", border: "1.5px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
            <div style={{ width: 38, height: 38, flex: "none", borderRadius: "var(--radius-sm)", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="calendar" size={19} color="var(--accent-text)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 15, color: "var(--text-primary)" }}>{renewalLabel()}</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-tertiary)" }}>in {days} day{days === 1 ? "" : "s"}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <IconButton variant="secondary" size={34} label="Earlier" onClick={() => setDays(d => Math.max(0, d - 1))}><Icon name="minus" size={16} /></IconButton>
              <IconButton variant="secondary" size={34} label="Later" onClick={() => setDays(d => d + 1)}><Icon name="plus" size={16} /></IconButton>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[["Tomorrow",1],["In a week",7],["In 2 weeks",14],["In a month",30]].map(([lbl,d]) => (
              <button key={lbl} onClick={() => setDays(d)} style={{ flex: 1, height: 30, borderRadius: "var(--radius-pill)", border: `1px solid ${days === d ? "transparent" : "var(--border-default)"}`, background: days === d ? "var(--ink-900)" : "transparent", color: days === d ? "#fff" : "var(--text-secondary)", fontFamily: "var(--font-sans)", fontSize: 11.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{lbl}</button>
            ))}
          </div>
        </div>

        <div>
          <Label>Category</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {cats.map(([name, c]) => {
              const on = cat === name;
              return (
                <button key={name} onClick={() => setCat(name)} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 34, padding: "0 12px", borderRadius: "var(--radius-pill)", border: `1.5px solid ${on ? `var(--cat-${c})` : "var(--border-default)"}`, background: on ? "var(--surface-card)" : "transparent", cursor: "pointer" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: `var(--cat-${c})` }} />
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: on ? 600 : 500, color: on ? "var(--text-primary)" : "var(--text-secondary)" }}>{name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Card padding="md">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>Remind me before renewal</div>
              <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 1 }}>7 and 3 days ahead</div>
            </div>
            <Switch checked={remind} onChange={setRemind} />
          </div>
        </Card>
      </div>
    </Sheet>
  );
}

function Label({ children }) {
  return <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", margin: "0 0 8px 2px" }}>{children}</div>;
}

window.AddSubscriptionScreen = AddSubscriptionScreen;
window.Label = Label;
