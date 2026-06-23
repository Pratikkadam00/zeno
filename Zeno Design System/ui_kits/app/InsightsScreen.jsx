/* Zeno — Insights tab (was Analytics/Budget). Spend intelligence + Pro tool entries. */
function InsightsScreen({ onUpgrade, onBudget }) {
  const Z = window.ZENO;
  const [range, setRange] = React.useState("6 mo");
  const max = Math.max(...Z.trend.map(t => t[1]));
  const total = Z.monthlyTotal;
  const catTotal = Z.categories.reduce((a, c) => a + c.spent, 0);
  const B = Z.budget;
  const over = B.projected > B.cap, approaching = !over && B.projected > 0.85 * B.cap;
  const bsc = over ? ["var(--danger-soft)", "var(--danger)", "triangle-alert", "Over budget"]
    : approaching ? ["var(--warning-soft)", "#B45309", "trending-up", "Approaching"]
    : ["var(--success-soft)", "var(--success)", "circle-check", "On pace"];

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 24 }}>
      <ScreenHeader large title="Insights" />

      {/* Budget — primary entry from Insights */}
      <div style={{ padding: "4px 16px 0" }}>
        <button onClick={onBudget} style={{ width: "100%", textAlign: "left", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "16px", cursor: "pointer", boxShadow: "var(--shadow-xs)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, flex: "none", borderRadius: "var(--radius-md)", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="target" size={20} color="var(--accent-text)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>Budget</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)" }}>Forecast ${B.projected.toFixed(2)} / ${B.cap} this month</div>
            </div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: "var(--radius-pill)", background: bsc[0], color: bsc[1] }}>
              <Icon name={bsc[2]} size={13} color={bsc[1]} /> {bsc[3]}
            </span>
          </div>
        </button>
      </div>

      {/* Trend */}
      <div style={{ padding: "14px 16px 0" }}>
        <Card padding="lg">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Monthly spend</div>
              <div style={{ marginTop: 8 }}><AmountDisplay amount={total} size="md" trend="up" trendValue="16%" /></div>
            </div>
            <Badge tone="neutral">{range}</Badge>
          </div>
          {/* bar chart */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 110, marginTop: 20 }}>
            {Z.trend.map(([m, v], i) => {
              const last = i === Z.trend.length - 1;
              return (
                <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ width: "100%", maxWidth: 30, height: `${(v / max) * 84}px`, background: last ? "var(--accent)" : "var(--accent-soft-2)", borderRadius: "var(--radius-sm)", transition: "height var(--dur-slow) var(--ease-out)" }} />
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: last ? "var(--text-primary)" : "var(--text-tertiary)", fontWeight: last ? 700 : 500 }}>{m}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Category breakdown */}
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--text-primary)", padding: "22px 20px 10px" }}>Where it goes</div>
      <div style={{ padding: "0 16px" }}>
        <Card padding="md">
          <div style={{ display: "flex", gap: 3, height: 10, marginBottom: 16, borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
            {Z.categories.map(c => <div key={c.category} style={{ flex: c.spent, background: `var(--cat-${c.cat})` }} />)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Z.categories.map(c => (
              <div key={c.category} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: `var(--cat-${c.cat})`, flex: "none" }} />
                <span style={{ flex: 1, fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{c.category}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-tertiary)" }}>{Math.round((c.spent / catTotal) * 100)}%</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--text-primary)", width: 60, textAlign: "right" }}>${c.spent.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Insights engine */}
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--text-primary)", padding: "22px 20px 10px" }}>Ways to save</div>
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {Z.insights.map(ins => (
          <div key={ins.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "12px 14px", boxShadow: "var(--shadow-xs)" }}>
            <div style={{ width: 38, height: 38, flex: "none", borderRadius: "var(--radius-md)", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={ins.icon} size={19} color="var(--accent-text)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 14, color: "var(--text-primary)" }}>{ins.title}</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)", marginTop: 1 }}>{ins.body}</div>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--accent-text)" }}>${ins.save}/yr</span>
          </div>
        ))}
      </div>

      {/* Pro tools */}
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--text-primary)", padding: "22px 20px 10px" }}>Power tools</div>
      <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[["AI Spend Coach","sparkles"],["Spend Twin","shuffle"],["Year in Review","gift"],["Widgets & Watch","layout-grid"]].map(([t, ic]) => (
          <button key={t} onClick={onUpgrade} style={{ textAlign: "left", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "14px", cursor: "pointer", boxShadow: "var(--shadow-xs)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Icon name={ic} size={22} color="var(--text-secondary)" />
              <Badge tone="pro" solid={false} style={{ background: "#e9e9f2", color: "#43417a" }}>Pro</Badge>
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 14, color: "var(--text-primary)", marginTop: 12 }}>{t}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
window.InsightsScreen = InsightsScreen;
