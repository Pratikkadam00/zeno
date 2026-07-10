/* Zeno — Add subscription (ledger restyle, editable renewal date kept).
   SLOP AUDIT — ① Zeno: caps section heads, rule-framed date stepper.
   ② Tempted by: chip-grid overload → text ticks. ③ Lazy: long form card. */
function AddSubscriptionScreen({ onClose }) {
  const popular = [
    { name: "Netflix", color: "#E50914" }, { name: "Spotify", color: "#1DB954" },
    { name: "YouTube", color: "#FF0000" }, { name: "Disney+", color: "#113CCF" },
    { name: "ChatGPT", color: "#10A37F" }, { name: "Notion", color: "#111111" },
    { name: "iCloud+", color: "#3B82F6" }, { name: "Figma", color: "#A259FF" },
  ];
  const cats = [["Entertainment", "violet"], ["Music", "coral"], ["Productivity", "blue"], ["Shopping", "pink"], ["Utilities", "amber"], ["Health", "teal"]];
  const [picked, setPicked] = React.useState("Netflix");
  const [cat, setCat] = React.useState("Entertainment");
  const [cadence, setCadence] = React.useState("Monthly");
  const [remind, setRemind] = React.useState(true);
  const [days, setDays] = React.useState(14);
  const renewalLabel = () => { const d = new Date(2026, 6, 10); d.setDate(d.getDate() + days); return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); };

  return (
    <Sheet title="NEW ENTRY" onClose={onClose}
      footer={<Button variant="primary" size="lg" fullWidth onClick={onClose}>Write it in</Button>}>
      <SectionHead pad="8px 0 10px">From the catalog · 600+</SectionHead>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        {popular.map(p => {
          const on = picked === p.name;
          return (
            <button key={p.name} onClick={() => setPicked(p.name)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "10px 4px", background: on ? "var(--surface-card)" : "none", border: `1px solid ${on ? "var(--ink-400)" : "var(--rule)"}`, borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
              <ServiceAvatar name={p.name} color={p.color} size={34} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.04em", color: on ? "var(--text-primary)" : "var(--text-tertiary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{p.name.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Input label="Name" value={picked} onChange={e => setPicked(e.target.value)} />
        <Input label="Cost" prefix="$" mono placeholder="0.00" suffix={`/ ${cadence === "Monthly" ? "mo" : "yr"}`} />
        <div>
          <SectionHead pad="0 0 8px">Billing cycle</SectionHead>
          <SegmentedControl options={["Monthly", "Yearly"]} value={cadence} onChange={setCadence} />
        </div>
        <div>
          <SectionHead pad="4px 0 8px">Next renews — you set it</SectionHead>
          <div style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--rule-strong)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 15 }}>{renewalLabel()}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.1em", color: "var(--text-tertiary)", marginTop: 2 }}>IN {days} DAY{days === 1 ? "" : "S"}</div>
            </div>
            <IconButton variant="secondary" size={36} label="Earlier" onClick={() => setDays(d => Math.max(0, d - 1))}><Icon name="minus" size={15} /></IconButton>
            <IconButton variant="secondary" size={36} label="Later" onClick={() => setDays(d => d + 1)}><Icon name="plus" size={15} /></IconButton>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[["TMRW", 1], ["1 WK", 7], ["2 WK", 14], ["1 MO", 30]].map(([lbl, d]) => (
              <button key={lbl} onClick={() => setDays(d)} style={{ flex: 1, height: 30, border: "none", borderBottom: `2px solid ${days === d ? "var(--accent)" : "var(--rule)"}`, background: "none", color: days === d ? "var(--text-primary)" : "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer" }}>{lbl}</button>
            ))}
          </div>
        </div>
        <div>
          <SectionHead pad="4px 0 8px">Category</SectionHead>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
            {cats.map(([name, c]) => {
              const on = cat === name;
              return (
                <button key={name} onClick={() => setCat(name)} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 34, background: "none", border: "none", borderBottom: `2px solid ${on ? `var(--cat-${c})` : "transparent"}`, cursor: "pointer", padding: 0 }}>
                  <span style={{ width: 8, height: 3, background: `var(--cat-${c})` }}></span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: on ? 700 : 500, letterSpacing: "0.08em", color: on ? "var(--text-primary)" : "var(--text-secondary)" }}>{name.toUpperCase()}</span>
                </button>
              );
            })}
          </div>
        </div>
        <LedgerLine label="Remind me" sub="7D · 3D · DAY OF" value={<Switch checked={remind} onChange={setRemind} size="sm" />} />
      </div>
    </Sheet>
  );
}
window.AddSubscriptionScreen = AddSubscriptionScreen;
window.Label = function Label({ children }) { return <SectionHead pad="0 0 8px">{children}</SectionHead>; };
